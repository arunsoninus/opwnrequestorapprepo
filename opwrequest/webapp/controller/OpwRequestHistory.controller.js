sap.ui.define([
	"../controller/BaseController",
	"sap/ui/core/Fragment",
	"sap/ui/model/json/JSONModel",
	"../utils/dataformatter",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"../utils/services",
	"../utils/appconstant",
	"../utils/validation",
	"sap/ui/export/library",
	"sap/ui/export/Spreadsheet",
	"../utils/utility",
	"../utils/configuration",
	"../utils/massuploadhelper",
	"../utils/headerHelper",
	"../utils/processInstanceFlow"
], function (BaseController, Fragment, JSONModel, Formatter, MessageToast, MessageBox, Filter,
	FilterOperator, Sorter, Services, AppConstant, Validation, exportLibrary, Spreadsheet, Utility, Config,
	MassUploadHelper, HeaderHelper, ProcessInstanceFlow) {
	"use strict";
	return BaseController.extend("nus.edu.sg.opwrequest.controller.OpwRequestHistory", {
		formatter: Formatter,

		onInit: function () {
			this.oOwnerComponent = this.getOwnerComponent();
			this.oRouter = this.getOwnerComponent().getRouter();
			this._bDescendingSort = false;

			var oViewModel = new JSONModel(),
				oViewData = {
					"SortCwTable": {
						"sortKey": "",
						"sortDescending": ""
					},
					"GroupCwTable": {
						"groupKey": "",
						"groupDescending": ""
					},
					"SearchProperty": ""
				};
			oViewModel.setData(oViewData);
			this.getView().setModel(oViewModel, "ViewModel");
			//Navigation to details page
			this.oRouter.getRoute("master").attachPatternMatched(this._onProjectMatched, this);

		},
		_onProjectMatched: async function (oEvent) {
			this.initializeModel();
			await this.getUserDetails();
			// this.generateTokenForLoggedInUser();

			var oOpwnRequestTable = this.getView().byId("idOpwnRequestTable");
			this.oTemplate = oOpwnRequestTable.getBindingInfo("items").template;
			oOpwnRequestTable.unbindAggregation("items");

			var aUrlParameters = new URLSearchParams(window.location.search),
				sParam = aUrlParameters.get("navStat");
			this._setDefaultIconTabFilter(sParam);
		},
		initializeModel: function () {
			var readOnly = this.modelAssignment("ReadOnly");
			readOnly.setProperty("/isMassSubmissionVisible", false);
			readOnly.setProperty("/isSingleSubmission", true);
			var oAppModel = this.setComponentModel("AppModel");
			oAppModel.setData(AppConstant);
			this.AppModel = oAppModel;
		},
		getUserDetails: async function () {
			await Services.getUserInfoDetails(
				this,
				async function (oRetData) {
					Utility._assignTokenAndUserInfo(oRetData.getUserDetails, this);
					await this.getAllRequestDetails();
					Utility._fnFilterCreation(this);
				}.bind(this)
			);
		},
		/**
		 * Set icon tab bar filter default selection key
		 * @param {string} sParam: navStat parameter
		 */
		_setDefaultIconTabFilter: function (sParam) {
			switch (sParam) {
				case "c":
					this.AppModel.setProperty("/iconTabBarSelectedKey", "Post");
					break;
				case "p":
					this.AppModel.setProperty("/iconTabBarSelectedKey", "Process");
					break;
				case "r":
					this.AppModel.setProperty("/iconTabBarSelectedKey", "RejReq");
					break;
				case "d":
					this.AppModel.setProperty("/iconTabBarSelectedKey", "Deleted");
					break;
				case "w":
					this.AppModel.setProperty("/iconTabBarSelectedKey", "Withdrawn");
					break;
				case "cl":
					this.AppModel.setProperty("/iconTabBarSelectedKey", "ClosedReq");
					break;
				default:
					break;
			}
		},
		// generateTokenForLoggedInUser: function () {
		// 	Services.fetchLoggedUserToken(this, function (oRetData) {
		// 		Utility._assignTokenAndUserInfo(oRetData, this);
		// 		this.getAllOpwnRequests();
		// 		Utility._fnFilterCreation(this);
		// 	}.bind(this));
		// },
		getAllRequestDetails: async function () {
			this._fetchLoggedInUserPhoto();
			this.getOpwnRequests();
		},

		_fetchLoggedInUserPhoto: function () {
			//fetch photo
			Services.fetchUserPhoto(this, function (oResponse) {
				this.AppModel.setProperty("/staffPhoto", oResponse.photo ? "data:image/png;base64," + oResponse.photo : null);
			}.bind(this));
		},

		getOpwnRequests: function () {
			var selectedKey = this.AppModel.getProperty("/iconTabBarSelectedKey");
			this.getView().byId("itb1").setSelectedKey(selectedKey);
			var aFilter = [];
			let oDataModel = this.getComponentModel("OpwnSrvModel");
			// var userRole = this.AppModel.getProperty("/userRole");
			// if (userRole === "CW_ESS") {
			aFilter = Utility._fnEssDraft(this);
			// } else if (userRole === "CW_DEPARTMENT_ADMIN") {
			// 	aFilter = Utility._fnDeptAdminDraft(this);
			// }
			if (this.AppModel.getProperty("/oParameterNew") === "New") {
				this.AppModel.setProperty("/oParameterNew", "");
				this.onPressCreateOpwnRequest();
			}
			var serviceUrl = Config.dbOperations.requestViewCount;
			Services.getRequestViewCount(serviceUrl, oDataModel, this, aFilter, function (oResponse) {
				this.getUIControl("itfDraft").setCount(oResponse);
			}.bind(this));
			// var statusServiceUrl = Config.dbOperations.statusConfig;
			Services.getStatusConfig(this, function (oResponse) {
				this.AppModel.setProperty("/statusConfigDetails", oResponse.results ? oResponse.results : []);
				this.setRejStatusCount();
				this.setInProcessStatusCount();
				this.setPostedStatusCount();
				this.setWithdrawnCount();
				this.setWithcloseCount();
				this.setDeleteCount();
				//to set back the initially selected icon tab after navigating back from claimdetail view as it was before getting into detail view 
				var prevSelectedKeyOfIconTabBar = this.AppModel.getProperty("/prevSelectedKeyOfIconTabBar");
				if (prevSelectedKeyOfIconTabBar && prevSelectedKeyOfIconTabBar !== 'Draft') {
					this.loadTableItemsBasedOnStatusKey(prevSelectedKeyOfIconTabBar);
				} else if (selectedKey && selectedKey !== 'Draft') {
					this.loadTableItemsBasedOnStatusKey(selectedKey);
				} else {
					this.getDraftRequests();
				}
				// Utility._fnFilterCreation(this);
			}.bind(this));
			// this.handleFilter();
		},

		loadTableItemsBasedOnStatusKey: function (selectedKeyOfIconTabBar) {
			this.getView().byId("itb1").setSelectedKey(selectedKeyOfIconTabBar);
			var sPath = "OpwnSrvModel>" + Config.dbOperations.openRequestView;
			this.GlobalFilterForTable = Utility._handleIconTabBarSelect(this, selectedKeyOfIconTabBar);
			// Begin of change - CW0084
			var oViewModel = this.getView().getModel("ViewModel");
			var oSorter = new Sorter({
				path: oViewModel.getProperty("/SortCwTable/sortKey") !== "" ? oViewModel.getProperty("/SortCwTable/sortKey") : "REQ_UNIQUE_ID",
				descending: oViewModel.getProperty("/SortCwTable/sortDescending") !== "" ? oViewModel.getProperty("/SortCwTable/sortDescending") : true,
			}),
				oGroup,
				aFilters = [];
			if (oViewModel.getProperty("/GroupCwTable/groupKey") !== "") {
				oGroup = new Sorter(oViewModel.getProperty("/GroupCwTable/groupKey"), oViewModel.getProperty("/GroupCwTable/groupDescending"),
					true);
			}
			if (this.AppModel.getProperty("/showSearchField")) {
				aFilters = Utility._onPressSearchCWRequest(oViewModel.getProperty("/SearchProperty"), this);
			} else {
				aFilters = this.GlobalFilterForTable;
			}
			var oOpwnTable = this.getUIControl("idOpwnRequestTable");
			oOpwnTable.bindItems({
				path: sPath,
				sorter: oGroup ? oGroup : oSorter,
				template: this.oTemplate,
				filters: aFilters
			});
			// var oSorter = new sap.ui.model.Sorter({
			// 	path: "REQ_UNIQUE_ID",
			// 	descending: true
			// });
			// Utility._bindItems(this, "idOpwnRequestTable", sPath, oSorter, this.oTemplate, this.GlobalFilterForTable);
			// End of change - CW0084
		},

		setRejStatusCount: function () {
			var aFilter = Utility._rejStatusCount(this);
			var oDataModel = this.getOwnerComponent().getModel("OpwnSrvModel");
			var serviceUrl = Config.dbOperations.requestViewCount;
			Services.getRequestViewCount(serviceUrl, oDataModel, this, aFilter, function (oResponse) {
				this.getUIControl("itfReject").setCount(oResponse);
			}.bind(this));
		},

		setInProcessStatusCount: function () {
			var aFilter = Utility._setInProcessCount(this);
			var oDataModel = this.getOwnerComponent().getModel("OpwnSrvModel");
			var serviceUrl = Config.dbOperations.requestViewCount;
			Services.getRequestViewCount(serviceUrl, oDataModel, this, aFilter, function (oResponse) {
				this.getUIControl("itfProcess").setCount(oResponse);
			}.bind(this));
		},
		setPostedStatusCount: function () {
			var aFilter = Utility._setPostedStatusCount(this);
			var oDataModel = this.getOwnerComponent().getModel("OpwnSrvModel");
			var serviceUrl = Config.dbOperations.requestViewCount;
			Services.getRequestViewCount(serviceUrl, oDataModel, this, aFilter, function (oResponse) {
				this.getUIControl("itfPost").setCount(oResponse);
			}.bind(this));
		},

		setWithdrawnCount: function () {
			var aFilter = Utility._setWithdrawnCount(this);
			var oDataModel = this.getOwnerComponent().getModel("OpwnSrvModel");
			var serviceUrl = Config.dbOperations.requestViewCount;
			Services.getRequestViewCount(serviceUrl, oDataModel, this, aFilter, function (oResponse) {
				this.getUIControl("itfWithdrawn").setCount(oResponse);
			}.bind(this));
		},
		setWithcloseCount: function () {
			var aFilter = Utility._setWithcloseCount(this);
			var oDataModel = this.getOwnerComponent().getModel("OpwnSrvModel");
			var serviceUrl = Config.dbOperations.requestViewCount;
			Services.getRequestViewCount(serviceUrl, oDataModel, this, aFilter, function (oResponse) {
				this.getUIControl("itfClosedReq").setCount(oResponse);
			}.bind(this));
		},

		setDeleteCount: function () {
			var aFilter = Utility._setDeleteCount(this);
			var oDataModel = this.getOwnerComponent().getModel("OpwnSrvModel");
			var serviceUrl = Config.dbOperations.requestViewCount;
			Services.getRequestViewCount(serviceUrl, oDataModel, this, aFilter, function (oResponse) {
				this.getUIControl("itfDeleted").setCount(oResponse);
			}.bind(this));
		},
		onSelectType: function (oEvent) {
			var type = oEvent.getSource().getProperty("selectedKey");
			this.AppModel.setProperty("/InstructionMessage", "");
			this.AppModel.setProperty("/isTypeSelected", (type) ? true : false);
			if (type) {
				this.AppModel.setProperty("/InstructionMessage", (type === "EXT") ? this.getI18n("CwsRequest.Instruction1") + this.getI18n(
					"CwsRequest.Instruction2") :
					this.getI18n("CwsRequest.Instruction3") + this.getI18n("CwsRequest.Instruction4"));
				this._fnRequestType();
			}
		},
		// setPendReqStatusCount: function () {
		// 	var aFilter = Utility._setPendReqStatusCount(this);
		// 	var oDataModel = this.getOwnerComponent().getModel("OpwnSrvModel");
		// 	var serviceUrl = Config.dbOperations.requestViewCount;
		// 	Services.getRequestViewCount(serviceUrl, oDataModel, this, aFilter, function (oResponse) {
		// 		this.getUIControl("itfPendReq").setCount(oResponse);
		// 	}.bind(this));
		// },
		getDraftRequests: function () {
			var sPath = "OpwnSrvModel>" + Config.dbOperations.openRequestView;
			this.GlobalFilterForTable = Utility._fnEssDraft(this);
			var oSorter = new sap.ui.model.Sorter({
				path: "REQ_UNIQUE_ID",
				descending: true
			});
			Utility._bindItems(this, "idOpwnRequestTable", sPath, oSorter, this.oTemplate, this.GlobalFilterForTable);
		},

		onRefreshClaim: function (oEvent) {
			this.getOpwnRequests();
			// this._fnReadAfterMetadataLoaded(this.oOwnerComponent.getModel("OpwnSrvModel"));
		},
		onSelectIconFilter: function (oEvent) {
			this.getUIControl("idOpwnRequestTable").setVisible(true);
			var sPath = "OpwnSrvModel>" + Config.dbOperations.openRequestView;
			// var sKey = oEvent.getParameter("selectedKey");
			var sKey = oEvent === "Draft" ? "Draft" : oEvent.getParameter("selectedKey");
			// Begin of change - CCEV3364
			if (this._pViewSettingsDialog) {
				this._pViewSettingsDialog.then(function (oDialog) {
					oDialog.destroy();
				});
				this._pViewSettingsDialog = "";
			}
			// End of change - CCEV3364
			if (sKey === "Draft") {
				this.getDraftRequests();
			} else if (sKey === "New") {
				this.onPressCreateOpwnRequest();
				this.AppModel.setProperty("/cwsRequest/SingleSubRadioSelected", true);
				this.getUIControl("idOpwnRequestTable").setVisible(false);
			} else {
				this.GlobalFilterForTable = Utility._handleIconTabBarSelect(this, sKey);
				// Begin of change - CW0084
				var oViewModel = this.getView().getModel("ViewModel"),
					oSorter;
				// var oSorter = new sap.ui.model.Sorter({
				// 	path: "REQ_UNIQUE_ID",
				// 	descending: true
				// });
				if (oViewModel.getProperty("/GroupCwTable/groupKey") !== "") {
					oSorter = new Sorter(oViewModel.getProperty("/GroupCwTable/groupKey"), oViewModel.getProperty("/GroupCwTable/groupDescending"),
						true);
				} else {
					oSorter = new Sorter({
						path: oViewModel.getProperty("/SortCwTable/sortKey") !== "" ? oViewModel.getProperty("/SortCwTable/sortKey") : "REQ_UNIQUE_ID",
						descending: oViewModel.getProperty("/SortCwTable/sortDescending") !== "" ? oViewModel.getProperty(
							"/SortCwTable/sortDescending") : true,
					});
				}

				Utility._bindItems(this, "idOpwnRequestTable", sPath, oSorter, this.oTemplate, this.GlobalFilterForTable);
			}
		},
		onPressSortRequest: function (oEvent) {
			var sDialogTab = "sort";
			// load asynchronous XML fragment
			// Begin of change - CW0084
			// var fragmentName = "nus.edu.sg.opwrequest.view.ViewSettingsDialog";
			// var fragId = this.getView().getId();
			// Utility._handleOpenFragment(this, fragmentName, fragId, sDialogTab);
			if (!this._pViewSettingsDialog) {
				this._pViewSettingsDialog = Fragment.load({
					id: this.getView().getId(),
					name: "nus.edu.sg.opwrequest.view.ViewSettingsDialog",
					controller: this
				}).then(function (oDialog) {
					// connect dialog to the root view of this component (models, lifecycle)
					this.getView().addDependent(oDialog);
					return oDialog;
				}.bind(this));
			}
			this._pViewSettingsDialog.then(function (oDialog) {
				oDialog.open(sDialogTab);
			});
			// End of change - CW0084
		},
		onPressGroupRequest: function (oEvent) {
			var sDialogTab = "group";
			// load asynchronous XML fragment
			if (!this._pViewSettingsDialog) {
				this._pViewSettingsDialog = Fragment.load({
					id: this.getView().getId(),
					name: "nus.edu.sg.opwrequest.view.ViewSettingsDialog",
					controller: this
				}).then(function (oDialog) {
					// connect dialog to the root view of this component (models, lifecycle)
					this.getView().addDependent(oDialog);
					return oDialog;
				}.bind(this));
			}
			this._pViewSettingsDialog.then(function (oDialog) {
				oDialog.open(sDialogTab);
			});
		},
		handleConfirm: function (oEvent) {
			var oTable = this.getUIControl("idOpwnRequestTable");
			var sValue = this.getUIControl("srchFldCWSRequest").getValue();
			var oSelectedSort = oEvent.getParameter("sortItem");
			var sortingMethod = oEvent.getParameter("sortDescending");
			var oSelectedGroup = oEvent.getParameter("groupItem");
			var groupMethod = oEvent.getParameter("groupDescending");
			var mParams = oEvent.getParameters(),
				oBinding = oTable.getBinding("items"),
				sPath,
				bDescending,
				aSorters = [],
				vGroup,
				aGroups = [];
			// Begin of change - Bug fix - CW0084
			var oViewModel = this.getView().getModel("ViewModel"),
				oSort, oGroup;
			if (oSelectedSort) {
				oSort = {
					sortKey: oSelectedSort.getKey(),
					sortDescending: sortingMethod
				};
			} else {
				oSort = {
					sortKey: "REQ_UNIQUE_ID",
					sortDescending: true
				};
			}
			oViewModel.setProperty("/SortCwTable", oSort);
			this.applySortTable(oBinding, oSort);
			if (oSelectedGroup) {
				oGroup = {
					groupKey: oSelectedGroup.getKey(),
					groupDescending: groupMethod
				};
			} else {
				oGroup = "";
			}
			oViewModel.setProperty("/GroupCwTable", oGroup);
			this.applyGroupTable(oBinding, oGroup);
			// if (oSelectedSort) {
			// 	sPath = mParams.sortItem.getKey();
			// 	bDescending = mParams.sortDescending;
			// 	aSorters.push(new Sorter(sPath, bDescending));
			// 	oBinding.sort(aSorters);
			// }

			// if (oSelectedGroup) {
			// 	sPath = mParams.groupItem.getKey();
			// 	bDescending = mParams.groupDescending;
			// 	aGroups.push(new Sorter(sPath, bDescending, true));
			// 	oBinding.sort(aGroups);
			// }
			// End of change - Bug fix - CW0084
			// Utility._filterSortingRequestTable(this, oTable, sValue, oSelectedSort, sortingMethod, oSelectedGroup, groupMethod);
		},

		// Sort - common function for sort and group - Bug fix - CW0084
		applySortTable: function (oBinding, oSort) {
			var aSorters = [];
			if (oSort) {
				aSorters.push(new Sorter(oSort.sortKey, oSort.sortDescending));
				oBinding.sort(aSorters);
			}
		},

		// Group - common function for sort and group - Bug fix - CW0084
		applyGroupTable: function (oBinding, oGroup) {
			var aGroups = [];
			if (oGroup) {
				aGroups.push(new Sorter(oGroup.groupKey, oGroup.groupDescending, true));
				oBinding.sort(aGroups);
			}
		},

		/**
		 * On Press Preview Opwn Request
		 */
		onPressPreviewOpwnRequest: function (oEvent) {
			Utility._clearModelBeforeNavigationToCWDetailView(this);
			//to set the selected icon tab in the model
			var prevSelectedKeyOfIconTabBar = this.getView().byId("itb1").getSelectedKey();
			this.AppModel.setProperty("/prevSelectedKeyOfIconTabBar", prevSelectedKeyOfIconTabBar);
			this.AppModel.setProperty("/cwsRequest/validationRequest", {});

			var localModel = oEvent.getSource().getBindingContext("OpwnSrvModel");
			var ruleSet = localModel.getPath().split("/").slice(-1).pop();
			this.handleRouting("detail", {
				project: ruleSet,
				layout: "MidColumnFullScreen"
			});

		},

		onPressCopy: function (oEvent) {
			this.showBusyIndicator();
			Utility._clearModelBeforeNavigationToCWDetailView(this);
			var prevSelectedKeyOfIconTabBar = this.getView().byId("itb1").getSelectedKey();
			this.AppModel.setProperty("/prevSelectedKeyOfIconTabBar", prevSelectedKeyOfIconTabBar);
			this.AppModel.setProperty("/cwsRequest/validationRequest", {});

			var localModel = oEvent.getSource().getBindingContext("OpwnSrvModel");
			var ruleSet = localModel.getPath().split("/").slice(-1).pop();
			this.AppModel.setProperty("/oCopyMode", "Copied");
			this.handleRouting("detail", {
				project: ruleSet,
				layout: "MidColumnFullScreen"
			});
		},

		openQuickView: function (oEvent) {
			var fragId = this.getView().getId();
			var fragName = "nus.edu.sg.opwrequest.view.fragments.UserQuickView";
			Utility._handleOpenPopOver(oEvent, this, this._pQuickView, fragName, fragId);
		},

		handleQuickViewBtnPress: function (oEvent) {
			Utility._fnOpenQuickViewForStaff(this);
			this.openQuickView(oEvent);
		},

		handletypemismatch: function () {
			var msg = this.getI18n("CwsRequest.MassUpload.XlsOnly");
			this.showMessageStrip("cwsRequestDialogMStripId", msg, "E", "NewRequestTypeSelectionDialog");
		},

		onChangeNewRequestParams: function (oEvent, key) {
			this.closeMessageStrip("cwsRequestDialogMStripId", "NewRequestTypeSelectionDialog");
			var oNumber = oEvent.getSource().getValue();
			if (key === "DR") {
				if (oNumber) {
					oNumber = oNumber.replace(/\,/g, '');
					oNumber = Math.round(oNumber * 100) / 100;
					oNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
					oEvent.getSource().setValue(oNumber);
					this.AppModel.setProperty(oEvent.getSource().mBindingInfos.value.parts[0].path, oNumber);
					this.AppModel.refresh(true);
				} else {
					oEvent.getSource().setValue();
				}
			}
			var validationMsg = Validation.validateDatesNDuration(this);
			var data = this.AppModel.getProperty("/cwsRequest/createCWSRequest");
			var validateLeaving = Validation.validateLeavingDate(data, this);
			if (validationMsg) {
				oEvent.getSource().setValue("");
				this.showMessageStrip("cwsRequestDialogMStripId", validationMsg, "E", "NewRequestTypeSelectionDialog");
			}
			if (validateLeaving) {
				this.showMessageStrip("cwsRequestDialogMStripId", validateLeaving, "E", "NewRequestTypeSelectionDialog");
			}
		},
		/**
		 * on Press Create CWS Request
		 */
		onPressCreateOpwnRequest: function () {
			this.initializeModel();
			this.AppModel.setProperty("/cwsRequest/isMassUploadFeatureVisible", false);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest", {});
			this.AppModel.setProperty("/InstructionMessage", "");
			this.AppModel.setProperty("/isTypeSelected", false);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/noOfHeaderRows", 4);
			this.requestTypeSelection();
		},
		requestTypeSelection: function () {
			//Open a Dialog to show the Entire Data
			this.newRequestTypeDialog = sap.ui.xmlfragment("NewRequestTypeSelectionDialog",
				"nus.edu.sg.opwrequest.view.fragments.NewRequestTypeSelectionDialog", this);
			this.getView().addDependent(this.newRequestTypeDialog);
			this.newRequestTypeDialog.setEscapeHandler(function () {
				return;
			});
			this.initializeNewCwsRequest();
			this._fnRequestType();
			Utility.retrieveAttachmentTypes(this);
			this.newRequestTypeDialog.open();

		},
		_fnRequestType: function () {
			var aFilter = [],
				andFilter = [],
				// serviceUrl = "/CwsAppConfigs",
				oKey = this.AppModel.getProperty("/cwsRequest/createCWSRequest/TYPE");
			var oCatalogSrvModel = this.getComponentModel("CatalogSrvModel");
			andFilter.push(new Filter("REFERENCE_KEY", FilterOperator.EQ, oKey));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			Utility.retrieveRequestTypes(this);
			// Services.getRequestViewCount(null, oCatalogSrvModel, this, aFilter, function (oResponse) {
			// 	this.AppModel.setProperty("/RequestType", oResponse.results);
			// }.bind(this));
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oCatalogSrvModel, this, aFilter,
				function (oData) {
					this.AppModel.setProperty("/RequestType", oData.results);
				}.bind(this));
		},

		/**
		 * Initialize New CWS Request
		 */
		initializeNewCwsRequest: function () {
			var oCont = [],
				oStaffID = this.AppModel.getProperty("/staffInfo/STAFF_ID");
			this.AppModel.setProperty("/cwsRequest/SingleSubRadioSelected", true);
			this.AppModel.setProperty("/isEditableType", true);
			this.AppModel.setProperty("/isRequestType", false);
			$.each(this.AppModel.getProperty("/staffInfo/approverMatrix"), function (idx, obj) {
				if (obj.STF_NUMBER === oStaffID && obj.STAFF_USER_GRP === this.getI18n("CwsRequest.DepAdmin") &&
					(obj.PROCESS_CODE === obj.PROCESS_CODE === this.getI18n("CwsRequest.ProcessCode.203"))) {
					oCont.push(obj);
				}
			}.bind(this));
			if (oCont.length === 0) {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/TYPE", this.getI18n("CwsRequest.Internal"));
				this.AppModel.setProperty("/isEditableType", false);
			}
			if (oCont.length === 1 && oCont[0].STAFF_USER_GRP === this.getI18n("CwsRequest.DepAdmin") && oCont[0].PROCESS_CODE === this.getI18n(
				"CwsRequest.ProcessCode.201")) {
				this.AppModel.setProperty("/isRequestType", true);
			}
			this.closeMessageStrip("cwsRequestDialogMStripId", "NewRequestTypeSelectionDialog");
			this.AppModel.setProperty("/cwsRequest/validationRequest", {});
			this.AppModel.refresh(true);
			Utility.retrieveTypes(this);
		},

		/**
		 * On Select Request Type
		 */

		onSelectRequestType: function (oEvent) {
			this.AppModel.setProperty("/cwsRequest/Request_key", this.AppModel.getProperty("/RequestType/0/CONFIG_KEY"));
			this.AppModel.setProperty("/cwsRequest/Request_key_Desc", this.AppModel.getProperty("/RequestType/0/CONFIG_VALUE"));
			var oKey = oEvent.getSource().getSelectedButton().getText();
			// var oCwsSrvModel = this.oOwnerComponent.getModel("OpwnSrvModel");
			var oCatalogSrvModel = this.getComponentModel("CatalogSrvModel");
			// if (oKey === "Mass Upload") {
			// 	MessageBox.information(this.getI18n("CwsRequest.MassUploadInfo"));
			// }

			if (oKey === "Mass Upload" && !this.AppModel.getProperty("/oTemplateLink")) {
				var andFilter = [];
				andFilter.push(new sap.ui.model.Filter("ACCESS_ROLE", FilterOperator.EQ, 'CW_PROGRAM_ADMIN'));
				andFilter.push(new Filter("REFERENCE_KEY", FilterOperator.EQ, 'USEFULLINKS'));
				// var oURL = "/DashboardConfigurations";
				oCatalogSrvModel.read(Config.dbOperations.dashboardData, {
					filters: [andFilter],
					success: function (oData) {
						if (oData.results.length > 0) {
							this.AppModel.setProperty("/oTemplateLink", oData.results[0].CONFIG_VALUE);
						}
					}.bind(this),
					error: function (oError) {

					}
				});
			}
		},

		/**
		 * On Press Proceed to Create Request
		 */
		onPressProceedToCreate: function () {
			var type = this.AppModel.getProperty("/cwsRequest/createCWSRequest/TYPE");
			var startDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/START_DATE");
			var endDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/END_DATE");
			var durationDays = this.AppModel.getProperty("/cwsRequest/createCWSRequest/DURATION_DAYS");
			var amount = this.AppModel.getProperty("/cwsRequest/createCWSRequest/AMOUNT");
			var fullname = this.AppModel.getProperty("/cwsRequest/createCWSRequest/FULL_NM");
			var that = this;
			var data = this.AppModel.getProperty("/cwsRequest/createCWSRequest");
			var validateLeaving = Validation.validateLeavingDate(data, this);
			this.closeMessageStrip("cwsRequestDialogMStripId", "NewRequestTypeSelectionDialog");

			var oCatalogSrvModel = this.getComponentModel("CatalogSrvModel");
			var sStaffId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/STAFF_ID");

			var filters = that.generateFilter("SF_STF_NUMBER", [sStaffId]);

			if (!(type && startDate && endDate && durationDays && amount && fullname)) {
				this.showMessageStrip("cwsRequestDialogMStripId", this.getI18n("CwsRequest.Validation.RequiredFields"), "E", "NewRequestTypeSelectionDialog");
			} else if (validateLeaving) {
				this.showMessageStrip("cwsRequestDialogMStripId", validateLeaving, "E", "NewRequestTypeSelectionDialog");
			} else {

				oCatalogSrvModel.read(Config.dbOperations.userLookup, {
					filters: filters,
					success: function (oData) {
						if (oData.results.length) {
							var sEmpGrp;
							oData.results.forEach(function (oItem) {
								if (startDate >= oItem.START_DATE && endDate <= oItem.END_DATE) {
									sEmpGrp = oItem.EMP_GP_C;
								}
							});
							if (sEmpGrp !== this.getI18n("CwsRequest.EmployeeGroup")) {
								var utcStartDate = new Date(Date.UTC(
									startDate.getFullYear(),
									startDate.getMonth(),
									startDate.getDate(),
									startDate.getHours(),
									startDate.getMinutes(),
									startDate.getSeconds()
								)),
									utcEndDate = new Date(Date.UTC(
										endDate.getFullYear(),
										endDate.getMonth(),
										endDate.getDate(),
										endDate.getHours(),
										endDate.getMinutes(),
										endDate.getSeconds()
									));
								this._payrollCheck(utcStartDate, utcEndDate);
							} else {
								this.showMessageStrip("cwsRequestDialogMStripId",
									"User is a Non-Employee, hence is not allowed to submit OPWN request in the system.", "E",
									"NewRequestTypeSelectionDialog");
							}
						}
					}.bind(this),
					error: function (oError) {

					}
				});
			}
		},

		_payrollCheck: function (startDate, endDate) {
			var payrollReq = {
				"staffId": this.AppModel.getProperty("/cwsRequest/createCWSRequest/STAFF_ID"),
				"startDate": startDate,
				"endDate": endDate
			};
			// var sUrl = Config.dbOperations.payrollArea;
			Services.getPayrollArea(this, payrollReq, function (payrollData) {
				var oCode = payrollData.statusCode;
				if (oCode === "S") {
					this.fnPaymentAmount('N');
				} else {
					this.showMessageStrip("cwsRequestDialogMStripId", payrollData.message, "E",
						"NewRequestTypeSelectionDialog");
				}
			}.bind(this)
			);

			// var oHeaders = Formatter._amendHeaderToken(this);
			// var uModel = new JSONModel();
			// uModel.loadData(sUrl, JSON.stringify(tHeader), null, "POST", null, null, oHeaders);
			// uModel.attachRequestCompleted(function (oResponse) {
			// 	var oCode = oResponse.getSource().getProperty("/statusCode");
			// 	if (oCode === "S") {
			// 		this.fnPaymentAmount('N');
			// 	} else {
			// 		this.showMessageStrip("cwsRequestDialogMStripId", oResponse.getSource().getProperty("/message"), "E",
			// 			"NewRequestTypeSelectionDialog");
			// 	}
			// }.bind(this));
		},

		_fncreateLoad: function () {
			// var oCwsSrvModel = this.oOwnerComponent.getModel("OpwnSrvModel");
			var oCatalogSrvModel = this.getComponentModel("CatalogSrvModel");
			var staffNusNetId = this.AppModel.getProperty("/primaryAssigment/NUSNET_ID");
			var filters = this.generateFilter("NUSNET_ID", [staffNusNetId]);
			// var oKey = this.AppModel.getProperty("/staffInfo/IS_EXTERNAL_USER");
			// var oURL = (oKey && oKey === "X") ? "/ChrsExternalUsersInfos" : "/ChrsJobInfos";
			Services.readLookups(Config.dbOperations.userLookup, oCatalogSrvModel, this, filters,
				function (oData) {
					if (oData.results.length) {
						var oEmpGrp = oData.results[0].EMP_GP_C;
						if (oEmpGrp !== this.getI18n("CwsRequest.EmployeeGroup")) {
							this.closeNewRequestTypeDialog();
							this.oRouter.navTo("detail", {
								project: "NEW",
								layout: "MidColumnFullScreen"
							});
						} else {
							this.showMessageStrip("cwsRequestDialogMStripId", this.getI18n("CwsRequest.Error.UserNotAllowed"), "E",
								"NewRequestTypeSelectionDialog");
						}
					}
				}.bind(this));
			// oCatalogSrvModel.read(Config.dbOperations.userLookup, {
			// 	filters: filters,
			// 	success: function (oData) {
			// 		if (oData.results.length) {
			// 			var oEmpGrp = oData.results[0].EMP_GP_C;
			// 			if (oEmpGrp !== this.getI18n("CwsRequest.EmployeeGroup")) {
			// 				this.closeNewRequestTypeDialog();
			// 				this.oRouter.navTo("detail", {
			// 					project: "NEW",
			// 					layout: "MidColumnFullScreen"
			// 				});
			// 			} else {
			// 				this.showMessageStrip("cwsRequestDialogMStripId", "User not allowed to submit CW/NED or OPWN request in the system", "E",
			// 					"NewRequestTypeSelectionDialog");
			// 			}
			// 		}
			// 	}.bind(this),
			// 	error: function (oError) {

			// 	}
			// });
		},

		/**
		 * Close CWS Duration Dialog
		 */
		closeNewRequestTypeDialog: function () {
			this.AppModel.setProperty("/iconTabBarSelectedKey", "Draft");
			this.onSelectIconFilter("Draft");
			if (this.newRequestTypeDialog) {
				this.newRequestTypeDialog.destroy(true);
			}
		},
		/**
		 * on Press MAss Upload Claim Request
		 */
		onPressMassUploadClaimRequests: function () {
			this.AppModel.setProperty("/cwsRequest/isMassUploadFeatureVisible", true);
			this.AppModel.setProperty("/visibility/ClaimTypeDialog/claimTypeDialogStaffId", false);
			this.AppModel.setProperty("/requiredUiControl/ClaimTypeDialog/claimTypeDialogStaffId", false);
			this.claimTypeSelection();
		},
		claimTypeSelection: function () {
			//Open a Dialog to show the Entire Data
			this.claimTypeDialog = sap.ui.xmlfragment("ClaimTypeDialog",
				"nus.edu.sg.opwrequest.view.fragments.ClaimTypeDialog", this);
			this.claimTypeDialog.addStyleClass("sapUiSizeCompact");
			this.getView().addDependent(this.claimTypeDialog);
			this.claimTypeDialog.open();
			this.initializeNewClaimRequest();
			this.settingUluFdluValues();
			this.settingClaimTypeValue();
		},
		settingClaimTypeValue: function () {
			ClaimTypeDataHandling._settingClaimTypeValue(this);
		},

		initializeNewClaimRequest: function () {
			this.closeMessageStrip("claimTypeMessageStripId", "ClaimTypeDialog");
		},
		/**
		 * On Press Proceed to Create Request
		 */
		// onPressProceedToCreate: function () {
		// 	this.confirmPopUpToNavToExistingClaimReq();
		// },

		confirmAction: function () {
			this.closeMessageStrip("claimTypeMessageStripId", "ClaimTypeDialog");
			ClaimTypeDataHandling._confirmAction(this);
		},
		/**
		 * Close Claim Type Dialog
		 */
		closeClaimTypeDialog: function () {
			if (this.claimTypeDialog) {
				this.claimTypeDialog.close();
				this.claimTypeDialog.destroy();
				this.claimTypeDialog = null;
				this.claimTypeDialog = undefined;
			}
		},

		onPressBack: function () {
			this.initializeModel();
			this.handleNav("searchPage");
		},

		/**
		 * on Press Mass Upload Requests
		 */
		onPressMassUploadTemplate: function (oEvent) {
			var component = this;

			component.AppModel.setProperty("/oMassUploadVisible", false);
			component.AppModel.setProperty("/oMassUploadWVisible", false);
			component.AppModel.setProperty("/oMassUploadSVisible", false);
			component.AppModel.setProperty("/cwsRequest/createCWSRequest/massUploadResponseDisplay", []);
			component.AppModel.setProperty("/cwsRequest/createCWSRequest/massUploadRequestPayload", []);
			var fileUploader = component.getUIControl("massClaimsUploadId", "NewRequestTypeSelectionDialog");
			var file = fileUploader.oFileUpload.files[0];
			var requestType = component.AppModel.getProperty("/cwsRequest/Request_key");
			var claimType = component.AppModel.getProperty("/cwsRequest/createCWSRequest/TYPE");
			var noOfHeaderRows = component.AppModel.getProperty("/cwsRequest/createCWSRequest/noOfHeaderRows");

			if (!noOfHeaderRows) {
				MessageBox.error(this.getI18n("CwsRequest.MassUpload.HeaderRows"));
				return;
			} else if (!file) {
				MessageBox.error(this.getI18n("CwsRequest.MassUpload.UploadFile"));
				return;
			}

			if (isNaN(parseInt(noOfHeaderRows))) {
				noOfHeaderRows = 0;
			}
			component.showBusyIndicator();
			var form = new FormData();
			form.append("excelFile", file, file.name);
			form.append("processCode", "203");
			form.append("type", claimType);
			form.append("requestType", "OPWN");
			// form.append("period", period);
			form.append("noOfHeaderRows", noOfHeaderRows - 1);
			var oHeaders = HeaderHelper._headerToken();
			var sUrl = component.getComponentModel("OpwnSrvModel").sServiceUrl;
			delete oHeaders['Content-Type'];
			var settings = {
				"url": sUrl + "/cwsRequestUpload",
				"method": "POST",
				"timeout": 0,
				"headers": oHeaders,
				"processData": false,
				"mimeType": "multipart/form-data",
				"contentType": false,
				"data": form
			};
			$.ajax(settings)
				.done(function (response) {
					try {
						var parseResponse = JSON.parse(response);
						parseResponse = (parseResponse.d && parseResponse.d.cwsRequestUpload) ? parseResponse.d.cwsRequestUpload : {};
						component.AppModel.setProperty("/cwsRequest/createCWSRequest/massUploadResponse", parseResponse);
						component.AppModel.setProperty("/cwsRequest/createCWSRequest/massUploadResponseDisplay", parseResponse.displayPayload);
						component.AppModel.setProperty("/cwsRequest/createCWSRequest/massUploadRequestPayload", parseResponse.requestPayload);
						if (parseResponse.displayPayload.length > 0) {
							component.AppModel.setProperty("/PaymentData", parseResponse.displayPayload[0]);
						}
						parseResponse.displayPayload.find(function (element) {
							if (element.statusCode === "S") {
								component.AppModel.setProperty("/oMassUploadSVisible", true);
								component.AppModel.setProperty("/oMassUploadSMessage", element.message);
							}
						}.bind(component));
						parseResponse.displayPayload.find(function (element) {
							if (element.statusCode === "W") {
								component.AppModel.setProperty("/oMassUploadWVisible", true);
								component.AppModel.setProperty("/oMassUploadSVisible", false);
								component.AppModel.setProperty("/oMassUploadWMessage", element.message);
							}
						}.bind(component));
						parseResponse.displayPayload.find(function (element) {
							if (element.statusCode === "E") {
								component.AppModel.setProperty("/oMassUploadVisible", true);
								component.AppModel.setProperty("/oMassUploadWVisible", false);
								component.AppModel.setProperty("/oMassUploadSVisible", false);
								var msg = (element.message) ? element.message : component.getI18n("MassUpload.Error");
								component.AppModel.setProperty("/oMassUploadMessage", msg);
							}
						}.bind(component));

						component.onSelectIconStatus();

						if (parseResponse.error) { //successfully upload
							//aggregate error messages for a particular claim request row				
							var aDisplayPayload = parseResponse.displayPayload;
							for (var i = 0; i < aDisplayPayload.length; i++) {
								var itemOfEachRow = aDisplayPayload[i];
								//	var itemSetItem = {};
								var aErrorMessages = itemOfEachRow.validationResults;
								var errorMessageOfEachRow = "";
								for (var j = 0; j < aErrorMessages.length; j++) {
									var itemOfEachErrorMessage = aErrorMessages[j];
									if (j === 0) {
										errorMessageOfEachRow = "(".concat((j + 1), ")").concat(" ", itemOfEachErrorMessage.message);
									} else {
										errorMessageOfEachRow = errorMessageOfEachRow.concat(". (", (j + 1)).concat(") ", itemOfEachErrorMessage.message);
									}
								}
								itemOfEachRow.errorMessage = errorMessageOfEachRow;
							}

						} else { //during failed
							//show the backend mass upload response in a fragment
							if (!component._oMassUploadResponse) {
								component._oMassUploadResponse = sap.ui.xmlfragment("fragMassUploadResponse",
									"nus.edu.sg.opwrequest.view.fragments.detaillayout.MassUploadResponse", component);
								component.getView().addDependent(component._oMassUploadResponse);
								component._oMassUploadResponse.setEscapeHandler(function () {
									return;
								});
								component.AppModel.setProperty("/massUploader", true);
								component._oMassUploadResponse.open();
							}
							// close dialog
							component.closeNewRequestTypeDialog();
						}
					} catch (oError) {
						MessageBox.error(this.getI18n("CwsRequest.MassUpload.FailedRequestData"));
					} finally { }
				}.bind(component))
				.fail(function (response) {
					var parseResponse = JSON.parse(response.responseText);
					if (parseResponse.error) {
						MessageBox.error(parseResponse.message);
					}
				}.bind(component))
				.always(function () {
					component.hideBusyIndicator();
				}.bind(component));

		},

		onSelectIconStatus: function (oEvent) {
			this.AppModel.setProperty("/oSuVisible", false);
			this.AppModel.setProperty("/oErVisible", false);
			this.AppModel.setProperty("/oWrVisible", false);
			var oData = this.AppModel.getProperty("/cwsRequest/createCWSRequest/massUploadResponseDisplay");
			oData.find(function (element) {
				if (element.ERROR_STATE === true) {
					this.AppModel.setProperty("/oErVisible", true);
				}
				if (element.ERROR_STATE === false && element.statusCode === "S") {
					this.AppModel.setProperty("/oSuVisible", true);
				}
				if (element.statusCode === "W") {
					this.AppModel.setProperty("/oWrVisible", true);
				}
			}.bind(this));

			var key = oEvent ? oEvent.getSource().getSelectedKey() : "";
			key = key ? key : this.AppModel.getProperty("/oErVisible") ? "Error" : this.AppModel.getProperty("/oWrVisible") ? "Warning" :
				"Success";
			if (key === "Success") {
				var excludedCondition = (oData) => oData.statusCode === "S";
				var filteredArray = oData.filter((element) => excludedCondition(element));
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/massUploadFilter", filteredArray);
				this.AppModel.setProperty("/oMassSelectedKey", key);
			} else if (key === "Warning") {
				var excludedCondition = (oData) => oData.statusCode === "W";
				var filteredArray = oData.filter((element) => excludedCondition(element));
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/massUploadFilter", filteredArray);
				this.AppModel.setProperty("/oMassSelectedKey", key);
			} else {
				var excludedCondition = (oData) => oData.ERROR_STATE === false;
				var filteredArray = oData.filter((element) => !excludedCondition(element));
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/massUploadFilter", filteredArray);
				this.AppModel.setProperty("/oMassSelectedKey", key);
			}
			// if (oEvent) {
			// 	var oTable = oEvent.getSource().getContent()[0];
			// 	var otemplate = oTable.getBindingInfo("items").template;
			// 	oTable.unbindItems();
			// 	oTable.bindItems({
			// 		path: "AppModel>/cwsRequest/createCWSRequest/massUploadFilter",
			// 		template: otemplate
			// 	});
			// }
			this.AppModel.setProperty("/oErrorlabel", key);
			this.onPressPayPreview();
		},

		onPressmasscancel: function (key) {
			var that = this;
			if (this.AppModel.getProperty("/oMassAttachmentID") && key === "S") {
				MessageBox.warning(
					this.getI18n("CwsRequest.MassUpload.CancelConfirm"), {
					title: "Warning",
					actions: [sap.m.MessageBox.Action.YES,
					sap.m.MessageBox.Action.NO
					],
					emphasizedAction: sap.m.MessageBox.Action.OK,
					onClose: function (oAction) {
						if (oAction === "YES") {
							that._fnDeleteAttachment("N");
							that.AppModel.setProperty("/oMassAttachmentID", "");
							that._oMassUploadResponse.close();
							that._oMassUploadResponse.destroy();
							that._oMassUploadResponse = undefined;
							that._oMassUploadResponse = null;
						}
					}
				});
			} else {
				that.AppModel.setProperty("/oMassAttachmentID", "");
				that._oMassUploadResponse.close();
				that._oMassUploadResponse.destroy();
				that._oMassUploadResponse = undefined;
				that._oMassUploadResponse = null;
			}
		},

		onSelectUpload: function () {
			var isError = false,
				oData = this.AppModel.getProperty("/cwsRequest/createCWSRequest/massUploadResponseDisplay");
			oData.find(function (element) {
				if (element.ERROR_STATE === true) {
					isError = true;
				}
			}.bind(this));
			if (isError) {
				MessageBox.error(this.getI18n("CwsRequest.MassUpload.CheckErrors"));
				var oMassDisplay = this.getUIControl("itbUpload", "fragMassUploadResponse");
				oMassDisplay.setSelectedKey("request");
				return;
			}
		},

		_fnFetchUserDetailFromChrsJobInfo: function () {
			var that = this;
			var OpwnSrvModel = this.oOwnerComponent.getModel("OpwnSrvModel");
			var staffId = "";
			staffId = this.AppModel.getProperty("/loggedInUserId");
			if (!staffId) {
				staffId = this.AppModel.getProperty("/staffId");
			}
			var filters = Utility._generateFilter("NUSNET_ID", [staffId]);
			var serviceUrl = Config.dbOperations.chrsJobInfo;
			Services._readDataUsingOdataModel(serviceUrl, OpwnSrvModel, this, filters, function (oData) {
				this.AppModel.setProperty("/cwsRequest/UluFdluList", oData.results);
				if (oData.results.length === 1) {
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/uluSelected", oData.results[0].ULU_T);
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/fdluSelected", oData.results[0].FDLU_T);
				}
			}.bind(this));
		},

		onPressSearchCWSRequest: function (oEvent) {
			var sValue = this.getView().byId("srchFldCWSRequest").getValue();
			var sPath = "OpwnSrvModel>" + Config.dbOperations.openRequestView;
			var oViewModel = this.getView().getModel("ViewModel");
			var oSorter = new Sorter({
				path: oViewModel.getProperty("/SortCwTable/sortKey") !== "" ? oViewModel.getProperty("/SortCwTable/sortKey") : "REQ_UNIQUE_ID",
				descending: oViewModel.getProperty("/SortCwTable/sortDescending") !== "" ? oViewModel.getProperty("/SortCwTable/sortDescending") : true,
			});
			oViewModel.setProperty("/SearchProperty", sValue);
			var aFilter = Utility._onPressSearchCWRequest(sValue, this);
			Utility._bindItems(this, "idOpwnRequestTable", sPath, oSorter, this.oTemplate, aFilter);
		},

		handleValueHelpStaff: function (oEvent, searchValue) {
			var oView = this.getView();
			var oHeaders = Formatter._amendHeaderToken(this);
			var ulu = this.AppModel.getProperty("/cwsRequest/createcwsRequest/uluSelectedCode");
			var fdlu = this.AppModel.getProperty("/cwsRequest/createcwsRequest/fdluSelectedCode");
			var claimType = this.AppModel.getProperty("/cwsRequest/createcwsRequest/claimTypeList/0/CLAIM_TYPE_C");
			var period = this.AppModel.getProperty("/cwsRequest/createcwsRequest/actSelMonYearInNo");

			var serviceUrl = Config.dbOperations.caStaffLookUp;
			var oParameter = {
				"ulu": ulu,
				"fdlu": fdlu,
				"claimType": claimType,
				"period": period
			};
			if (searchValue) {
				oParameter.searchValue = searchValue;
			}
			Services._loadDataUsingJsonModel(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
				this.AppModel.setProperty("/cwsRequest/staffList", oData.getSource().getData());
				var fragmentName = "nus.edu.sg.opwrequest.view.fragments.detaillayout.StaffValueHelpDialog";
				var fragId = oView.getId();
				Utility._handleOpenFragment(this, fragmentName, fragId, null);
			}.bind(this));
		},

		/*handleConfirmStaff: function (oEvent) {
			// reset the filter
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([]);
			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				var sPath = aContexts[0].getPath();
				var objSelectedStaff = this.AppModel.getProperty(sPath);
				var objStaff = {
					"STAFF_ID": objSelectedStaff.STF_NUMBER,
					"NUSNET_ID": objSelectedStaff.NUSNET_ID,
					"ULU": objSelectedStaff.ULU_C,
					"FDLU": objSelectedStaff.FDLU_C,
					"STAFF_FULL_NAME": objSelectedStaff.FULL_NM
				};
				this.AppModel.setProperty("/cwsRequest/createcwsRequest/staffList", [objStaff]);
				this.AppModel.setProperty("/cwsRequest/createcwsRequest/claimantNusNetId", objSelectedStaff.NUSNET_ID);
			}
		},*/

		handleValueHelpClaimType: function (oEvent) {
			var oView = this.getView();
			var fragmentName = "nus.edu.sg.claimrequest.view.fragments.detaillayout.ClaimTypeValueHelpDialog";
			var fragId = oView.getId();
			Utility._handleOpenFragment(this, fragmentName, fragId, null);
		},

		//	navToExistingClaimRequest: function (oAction) {},

		onExportMassUploadResponse: function () {
			var aCols, aRows, oSettings, oSheet;
			aCols = MassUploadHelper._createColumnConfig();
			aRows = this.AppModel.getProperty("/cwsRequest/createCWSRequest/massUploadFilter");

			if (aRows.length > 0) {
				var oDataSource = this.generateLineItem(aRows);
				oSettings = {
					workbook: {
						columns: aCols,
						context: {
							sheetName: "OPWN Request Details"
						}
					},
					dataSource: oDataSource,
					fileName: "MassUpload_OPWN_Export.xlsx"
				};

				oSheet = new Spreadsheet(oSettings);
				oSheet.build()
					.then(function () {
						MessageToast.show(this.getI18n("CwsRequest.MassUpload.DownloadSuccess"));
					})
					.finally(oSheet.destroy);
			} else {
				MessageBox.error(this.getI18n("CwsRequest.MassUpload.NoData"));
			}
		},

		generateLineItem: function (dataArray) {
			var oView = this;
			var spreadsheetData = dataArray.flatMap(data => {
				const baseData = {
					"SERIAL_NO": data.SERIAL_NO,
					"STAFF_ID": data.STAFF_ID,
					"START_DATE": data.START_DATE,
					"END_DATE": data.END_DATE,
					"DURATION_DAYS": data.DURATION_DAYS,
					"SUB_TYPE_T": data.SUB_TYPE,
					"amount": data.amount,
					"ULU": data.ULU,
					"FDLU": data.FDLU,
					"program_NAME": data.program_NAME,
					"LOCATION": data.LOCATION,
					"WORK_DETAILS": data.WORK_DETAILS,
					"PROPERTY_USAGE": data.PROPERTY_USAGE,
					"PROPERTY_DETAILS": data.PROPERTY_DETAILS,
					"Error": (data.validationResults).map(function (error) {
						return error.message;
					}).join("; "),
					"Warning": (data.warningValidationResults).map(function (error) {
						return error.message;
					}).join("; ")
				};

				return [baseData];
			});

			return spreadsheetData.flat();

		},

		onMessagePopoverPress: function (oEvent, key) {
			MassUploadHelper._onMessagePopoverPress(oEvent, this, key);
		},
		onPressSavemassrequest: function () {
			if (this.AppModel.getProperty("/oMassUploadVisible")) {
				MessageBox.error(this.AppModel.getProperty("/oMassUploadMessage"));
				return;
			}

			if (!this.AppModel.getProperty("/oMassAttachmentID")) {
				MessageBox.error(this.getI18n("CwsRequest.MassUpload.UploadZip"));
				return;
			}

			this.confirmOnActionSubmit(this.getI18n("CwsRequest.Submit.Declaration"), "I", function () {
				this.fnSaveMassRequest();
			}.bind(this));
			// var that = this;
			// MessageBox.confirm(this.getI18n("CwsRequest.Submit.Declaration"), {
			// 	title: "Confirmation",
			// 	actions: [sap.m.MessageBox.Action.YES,
			// 		sap.m.MessageBox.Action.NO
			// 	],
			// 	emphasizedAction: sap.m.MessageBox.Action.OK,
			// 	onClose: function (oAction) {
			// 		if (oAction === "YES") {
			// 			that.fnSaveMassRequest();
			// 		}
			// 	}
			// });
		},

		handlefilezipTypemismatch: function (oEvent) {
			return MessageBox.error(this.getI18n("CwsRequest.MassUpload.ZipOnly"));
		},

		fnSaveMassRequest: function () {
			this.showBusyIndicator();
			var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
				pattern: "yyyy-MM-dd"
			});
			var aRequestPayload = this.AppModel.getProperty("/cwsRequest/createCWSRequest/massUploadRequestPayload");
			var aPayload = [];
			for (var i = 0; i < aRequestPayload.length; i++) {
				var oRequestPayload = aRequestPayload[i];
				var sDate = oDateFormat.format(new Date(oRequestPayload.START_DATE));
				var eDate = oDateFormat.format(new Date(oRequestPayload.END_DATE));
				oRequestPayload.ACTION_CODE = "SUBMIT";
				oRequestPayload.MASS_REF_UPLOAD_ID = this.AppModel.getProperty("/oMassAttachmentID");
				oRequestPayload.MASS_REF_VAL = oRequestPayload.SERIAL_NO + "_" + oRequestPayload.STAFF_ID;
				oRequestPayload.START_DATE_STR = sDate;
				oRequestPayload.END_DATE_STR = eDate;
				oRequestPayload.SUBMITTED_BY = this.AppModel.getProperty("/staffInfo/STAFF_ID");
				if (!oRequestPayload.ERROR_STATE) {
					delete oRequestPayload.JOIN_DATE;
					aPayload.push(oRequestPayload);
				} else {
					continue;
				}
			}
			var oCont = {
				"cwRequest": aPayload
			};
			if (aPayload.length) {
				MassUploadHelper._fnPostMassSubmission(oCont, this);
			} else {
				MessageBox.error(this.getI18n("CwsRequest.MassUpload.NoRecords"));
				this.hideBusyIndicator();
				return;
			}

		},

		_fnHandleSubmission: function () {
			if (!this.oResizableDialog) {
				this.oResizableDialog = new sap.m.Dialog({
					title: "Information",
					resizable: true,
					content: new sap.m.Table({
						columns: [
							new sap.m.Column({
								header: new sap.m.Text({
									text: "Request ID"
								}),
								width: "120px",
								hAlign: "Left"
							}),
							new sap.m.Column({
								header: new sap.m.Text({
									text: "Mass Upload Reference ID"
								}),
								width: "150px",
								hAlign: "Left"
							}),
							new sap.m.Column({
								header: new sap.m.Text({
									text: "Staff Name"
								}),
								width: "180px",
								hAlign: "Left"
							}),
							new sap.m.Column({
								header: new sap.m.Text({
									text: "Start Date"
								}),
								width: "100px",
								hAlign: "Left"
							}),
							new sap.m.Column({
								header: new sap.m.Text({
									text: "End Date"
								}),
								width: "100px",
								hAlign: "Left"
							}),
							new sap.m.Column({
								header: new sap.m.Text({
									text: "Program Name"
								}),
								width: "100px",
								hAlign: "Left"
							}),
							new sap.m.Column({
								header: new sap.m.Text({
									text: "Message"
								}),
								width: "150px",
								hAlign: "Left"
							})
						],
						items: {
							path: "AppModel>/oSuccessData",
							template: new sap.m.ColumnListItem({
								cells: [
									new sap.m.Text({
										text: "{AppModel>REQUEST_ID}"
									}),
									new sap.m.Text({
										text: "{AppModel>MASS_REF_VAL}"
									}),
									new sap.m.Text({
										text: "{AppModel>FULL_NM}"
									}),
									new sap.m.Text({
										text: "{AppModel>START_DATE_STR}"
									}),
									new sap.m.Text({
										text: "{AppModel>END_DATE_STR}"
									}),
									new sap.m.Text({
										text: "{AppModel>PROGRAM_NAME}"
									}),
									new sap.m.ObjectStatus({
										text: "{= ${AppModel>statusCode} === 'S' ? 'Successful' : ${AppModel>message}}",
										state: "{= ${AppModel>statusCode} === 'S' ? 'Success' : 'Error' }"
									})
								]
							})
						}
					}),
					beginButton: new sap.m.Button({
						type: "Emphasized",
						text: "Export",
						press: function () {
							this._fnExportSubmission();
						}.bind(this)
					}),
					endButton: new sap.m.Button({
						text: "Close",
						press: function () {
							this.oResizableDialog.close();
						}.bind(this)
					})
				});
				this.getView().addDependent(this.oResizableDialog);
			}
			this.oResizableDialog.open();
		},

		_fnExportSubmission: function () {
			var oLoadData = this.AppModel.getProperty("/oSuccessData");
			$.each(oLoadData, function (idx, obj) {
				if (obj.statusCode === "S") {
					obj.message = "Successful"
				}
			});
			var EdmType = exportLibrary.EdmType;
			var aCols = Utility._createColumnSubmissionResponse(this, EdmType);
			var oSettings = {
				workbook: {
					columns: aCols,
					context: {
						sheetName: "Submission Details"
					}
				},
				dataSource: oLoadData,
				fileName: "Submission Details.xlsx"
			};

			var oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(function () {
				oSheet.destroy();
			});
		},

		onPressShowProcessTracker: function (oEvent) {
			// this.showBusyIndicator();
			this.initiateProcessInstanceRendering(oEvent);
			// ProcessInstanceFlow._onPressProcessInstance(oEvent, this);
		},
		initiateProcessInstanceRendering: async function (oEvent) {
			this.showBusyIndicator();
			var sPath = oEvent.getSource().getBindingContext("OpwnSrvModel").getPath();
			var selectedReq = this.getComponentModel("OpwnSrvModel").getProperty(sPath);
			if (!this._oProcessInstanceNode) {
				// this._oProcessInstanceNode = sap.ui.xmlfragment(this.createId("fragProcessInstanceNodeTest"),
				// 	"nus.edu.sg.opwrequest.view.fragments.TaskApprovalProcessFlow", component);

				this._oProcessInstanceNode = await Fragment.load({
					id: this.createId("fragProcessInstanceNodeTest"),
					name: "nus.edu.sg.opwrequest.view.fragments.TaskApprovalProcessFlow",
					controller: this
				});
				this.getView().addDependent(this._oProcessInstanceNode);
				// sap.ui.core.Fragment.byId(component.createId("fragExistingPromotion"), "tblExistingPromotion").setModel(
				// 	"ExistingPromotionModel");
				this._oProcessInstanceNode.setEscapeHandler(function () {
					return;
				});
			}
			//component.leaveDetails();
			this.AppModel.setProperty("/processFlowRequestID", selectedReq.REQUEST_ID);
			// await this._fnFrameProcessData(component,selectedReq);
			await ProcessInstanceFlow._fnFrameProcessData(this, selectedReq);
		},

		onPressCloseProcessNode: function () {
			ProcessInstanceFlow._onPressCloseProcessNode(this);
		},

		onNodePress: function (oEvent) {
			var oState = oEvent.getParameters().getState();
			var oData = this.AppModel.getProperty("/oFlowProcess/0/userList");
			if (oState === "Critical" && oData.length > 0) {
				if (!this._oDialoguserList) {
					this._oDialoguserList = sap.ui.xmlfragment(this.createId("userList"),
						"nus.edu.sg.opwrequest.view.fragments.ManagerFlow", this);
					this.getView().addDependent(this._oDialoguserList);
					this._oDialoguserList.open();
				}
			}
		},

		handleCloseList: function (oEvent) {
			this._oDialoguserList.close();
			this._oDialoguserList.destroy();
			this._oDialoguserList = undefined;
		},
		onPressFilterButton: function () {
			var visibleSearchField = this.AppModel.getProperty("/showSearchField");
			if (visibleSearchField) {
				this.AppModel.setProperty("/showSearchField", false);
			} else {
				this.AppModel.setProperty("/showSearchField", true);
			}
		},

		handleSearchStaff: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			this.handleValueHelpStaff(null, sValue);
		},

		/**
		 * On Press Export
		 */
		onPressExport: function () {
			this.getView().setBusy(true);
			var OpwnSrvModel = this.getComponentModel("OpwnSrvModel");
			this.GlobalFilterForTable = Utility._fnEssAllStatus(this);
			Services._readDataUsingOdataModel(Config.dbOperations.openRequestView, OpwnSrvModel, this, this.GlobalFilterForTable, function (oData) {
				if (oData.results.length > 0) {
					this._fnExportClaims(oData.results);
				}
				this.getView().setBusy(false);
			}.bind(this));
		},
		_fnExportClaims: function (oLoadData) {
			var EdmType = exportLibrary.EdmType;
			var aCols = Utility._createColumnClaimResponse(this, EdmType, false);
			var oSettings = {
				workbook: {
					columns: aCols,
					context: {
						sheetName: "Request Details"
					}
				},
				dataSource: oLoadData,
				fileName: "Request Details.xlsx",
				worker: false // We need to disable worker because we are using a MockServer as OData Service
			};

			var oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(function () {
				oSheet.destroy();
			});
		},
		onPressPayPreview: function (oEvent) {
			var sPath = oEvent ? oEvent.getSource().getBindingContext("AppModel").getPath() :
				"/cwsRequest/createCWSRequest/massUploadFilter/0";
			var oData = this.AppModel.getProperty(sPath);
			this.AppModel.setProperty("/PaymentData", oData);
		},

		getIdentity: function (oContext) {
			return oContext.getProperty('IDENTITY');
		},

		getGroupHeader: function (oGroup) {
			return new sap.m.GroupHeaderListItem({
				title: oGroup.key
			});
		},

		onPressAuditLog: function (oEvent) {
			//making rest call to get Audit Log data
			var sPath = oEvent.getSource().getBindingContext("OpwnSrvModel").getPath();
			var selectedReq = this.getComponentModel("OpwnSrvModel").getProperty(sPath);

			this.AppModel.setProperty("/claimRequest/draftId", selectedReq.REQ_UNIQUE_ID);

			Services.getAuditLogData(this, selectedReq, async function (auditResp) {
				if (auditResp && auditResp.auditLog) {
					var aHeaderLogData = [],
						aItemLogData = [], aAuditLogData = [],
						oAuditLogHeader = {
							data: aHeaderLogData,
							tabName: this.getI18n("AuditLogHeaderData")
						},
						oAuditLogItems = {
							data: aItemLogData,
							tabName: this.getI18n("AuditLogItemData")
						};


					for (var i = 0; i < auditResp.auditLog.length; i++) {
						if (auditResp.auditLog[i].tabName === 'EClaims Items') {
							for (var j = 0; j < auditResp.auditLog[i].data.length; j++) {

								var dates = auditResp.auditLog[i].data[j].IDENTITY.split(" ");
								var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
									pattern: "d MMM, yyyy"
								});
								if (dates[0] && dates[1] && dates[2]) {
									dates[0] = oDateFormat.format(new Date(dates[0]));
									dates[2] = oDateFormat.format(new Date(dates[2]));
									dates = dates[0] + ' ' + 'to' + ' ' + dates[2];
									auditResp.auditLog[i].data[j].IDENTITY = dates;
								} else if (dates[0]) {
									dates[0] = oDateFormat.format(new Date(dates[0]));
									auditResp.auditLog[i].data[j].IDENTITY = dates[0];
								}
							}
						}

						switch (auditResp.auditLog[i].tabName) {
							case "HeaderData":
								auditResp.auditLog[i].data.forEach(function (oHeaders) {
									aHeaderLogData.push(oHeaders);
								});
								break;
							default:
								auditResp.auditLog[i].data.forEach(function (oItems) {
									aItemLogData.push(oItems);
								});
								break;
						}
					}
					if (aHeaderLogData.length > 0) {
						oAuditLogHeader.data = aHeaderLogData;
						oAuditLogHeader.tabName = this.getI18n("AuditLogHeaderData");
						aAuditLogData.push(oAuditLogHeader);
					}
					if (aItemLogData.length > 0) {
						oAuditLogItems.data = aItemLogData;
						oAuditLogItems.tabName = this.getI18n("AuditLogItemData");
						aAuditLogData.push(oAuditLogItems);
					}
				}
				this.AppModel.setProperty("/AudLogs", aAuditLogData);
				if (!this._oDialogAddAuditLogs) {
					this._oDialogAddAuditLogs = sap.ui.xmlfragment(this.createId("AuditLog"),
						"nus.edu.sg.opwrequest.view.fragments.AuditLogDataView", this);
					this.getView().addDependent(this._oDialogAddAuditLogs);
					this._oDialogAddAuditLogs.setEscapeHandler(function () {
						return;
					});
					this._oDialogAddAuditLogs.open();
				}
			}.bind(this));
		},

		onCancelAuditLog: function (oEvent) {
			this._oDialogAddAuditLogs.close();
			this._oDialogAddAuditLogs.destroy();
			this._oDialogAddAuditLogs = undefined;
			this._oDialogAddAuditLogs = null;
		},

		onUploadZip: function () {
			var fileUploader = this.getUIControl("massClaimsUploadZip", "fragMassUploadResponse");
			var msgStrip = this.getUIControl("uploadMsg", "fragMassUploadResponse");
			var oListItem = this.getUIControl("oMassList", "fragMassUploadResponse");
			// msgStrip.setText("");
			this.AppModel.setProperty("/formattedText", "");
			msgStrip.setVisible(false);
			var file = fileUploader.oFileUpload.files[0];

			if (file) {
				//Always set the Mass Attachment ID to Empty
				this.AppModel.setProperty("/oMassAttachmentID", "");

				this.showBusyIndicator();
				var AttachmentSrvModel = this.getComponentModel("AttachmentSrvModel");
				var serviceUrl = AttachmentSrvModel.sServiceUrl.replace(/\/$/, '') + Config.dbOperations.massUploadAttach;
				// var sURL = Config.dbOperations.massUploadAttach;
				var oFileName = file.name;
				oFileName = oFileName.replace(/\.[^/.]+$/, '');
				var oDataResponse = this.AppModel.getProperty("/cwsRequest/createCWSRequest/massUploadResponseDisplay");
				/*var aPayload = [];
				for (var i = 0; i < oDataResponse.length; i++) {
					var oRequestPayload = oDataResponse[i];
					if (!oRequestPayload.ERROR_STATE) {
						aPayload.push(oRequestPayload);
					} else {
						continue;
					}
				}*/

				var excludedSuccCondition = (oDataResponse) => oDataResponse.ERROR_STATE === true;
				var SucccessPayload = oDataResponse.filter((element) => !excludedSuccCondition(element));
				var excludedErrCondition = (oDataResponse) => oDataResponse.ERROR_STATE === false;
				var ErrorPayload = oDataResponse.filter((element) => !excludedErrCondition(element));

				var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
					pattern: "yyyyMMdd_HHmmss"
				});
				var oDate = oDateFormat.format(new Date());

				var form = new FormData();
				form.append("massZipUploadFile", file, oFileName + "_" + oDate + ".zip");
				form.append("processCode", this.getI18n("CwsRequest.ProcessCode.203"));
				form.append("role", this.getI18n("CwsRequest.PrgAdmin"));
				form.append("staffLists", SucccessPayload.map(function (value) {
					return value.SERIAL_NO + "_" + value.STAFF_ID;
				}).join(","));
				form.append("errStaffLists", ErrorPayload.map(function (value) {
					return value.SERIAL_NO + "_" + value.STAFF_ID;
				}).join(","));
				var oHeaders = Utility._headerToken(this);
				delete oHeaders['Content-Type'];
				var settings = {
					"url": serviceUrl,
					"method": "POST",
					"timeout": 0,
					"headers": oHeaders,
					"processData": false,
					"mimeType": "multipart/form-data",
					"contentType": false,
					"data": form
				};
				$.ajax(settings)
					.done(function (response) {
						try {
							this.hideBusyIndicator();
							var parseResponse = JSON.parse(response);
							if (parseResponse.status === "E" || parseResponse.statusCode === "ERROR") {
								var message = parseResponse.message;
								var parts = message.replace(/[{}]/g, '').split(',');
								var formattedMessage = '';
								parts.forEach(function (part, index) {
									var colonIndex = part.indexOf(':');
									var boldText = `<strong>${part.substring(0, colonIndex)}</strong><br>`;
									var restOfText = part.substring(colonIndex + 1).trim();
									var lineBreak = index < parts.length - 1 ? '<br><br>' : ''; // Add line break for all parts except the last one
									formattedMessage += `${boldText} ${restOfText}${lineBreak}`;
								});

								this.AppModel.setProperty("/formattedText", formattedMessage);
								msgStrip.setVisible(true);
							} else {
								var oKeyid = parseResponse.attachmentId;
								this.AppModel.setProperty("/oMassAttachmentID", oKeyid);
								this.AppModel.setProperty("/oMassuploadResponse", parseResponse);
								this.AppModel.setProperty("/massUploader", false);
								oListItem.setVisible(true);
							}
						} catch (oError) {
							this.hideBusyIndicator();
							MessageBox.error(this.getI18n("CwsRequest.MassUpload.FailedRequestData"));
						} finally { }
					}.bind(this))
					.fail(function (response) {
						this.hideBusyIndicator();
						var parseResponse = JSON.parse(response.responseText);
						if (parseResponse.error) {
							MessageBox.error(parseResponse.message);
						}
					}.bind(this));
			} else {
				// msgStrip.setText("Please select file to upload.");
				// msgStrip.setType("Error");
				this.AppModel.setProperty("/formattedText", this.getI18n("CwsRequest.MassUpload.SelectFileToUpload"));
				msgStrip.setVisible(true);
			}
		},

		handleDeleteMassAttachment: function (oEvent) {
			var that = this;
			MessageBox.confirm(this.getI18n("CwsRequest.MassUpload.DeleteAttachment"), {
				title: "Confirmation",
				actions: [sap.m.MessageBox.Action.YES,
				sap.m.MessageBox.Action.NO
				],
				emphasizedAction: sap.m.MessageBox.Action.OK,
				onClose: function (oAction) {
					if (oAction === "YES") {
						that._fnDeleteAttachment("S");
					}
				}
			});
		},

		_fnDeleteAttachment: function (key) {
			this.showBusyIndicator();
			var oListItem = this.getUIControl("oMassList", "fragMassUploadResponse");
			var oParameter = {
				attachmentId: this.AppModel.getProperty("/oMassAttachmentID"),
				processCode: "203"
			};
			var oHeaders = Formatter._amendHeaderToken(this);
			var serviceUrl = Config.dbOperations.deleteMassAttachment;
			Services._loadDataAttachment(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
				if (oData.getSource().getData().status === "S") {
					this.hideBusyIndicator();
					if (key === "S") {
						MessageBox.success(oData.getSource().getData().message);
						this.AppModel.setProperty("/massUploader", true);
						oListItem.setVisible(false);
					}
				} else {
					this.hideBusyIndicator();
					MessageBox.error(oData.getSource().getData().message);
				}
			}.bind(this));
		},

		fnDocumentType: function () {
			var tableItems = [{
				documentType: "LOE",
				acronym: "Letter Of Engagement"
			}, {
				documentType: "STFACPT",
				acronym: "Staff's Acceptance"
			}, {
				documentType: "OTH",
				acronym: "Others"
			}];

			this.AppModel.setProperty("/oTableItems", tableItems);
		}

	});
});