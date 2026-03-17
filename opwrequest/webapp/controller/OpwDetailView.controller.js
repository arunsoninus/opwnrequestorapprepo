sap.ui.define([
	"../controller/BaseController", "../extensions/extendedvaluehelp", "sap/ui/core/Fragment",
	"sap/ui/model/json/JSONModel",
	"../utils/dataformatter", "sap/m/MessageToast", "sap/m/MessageBox", "../utils/services",
	"../utils/appconstant",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"../utils/utility",
	"../utils/configuration",
	"../utils/requestlockhelper",
	"../utils/validation",
	"sap/ui/core/ValueState"
], function (BaseController, ExtendedValueHelp, Fragment, JSONModel, Formatter, MessageToast, MessageBox, Services,
	AppConstant, Filter, FilterOperator, Utility, Config, RequestLockHelper, Validation, ValueState) {
	"use strict";

	return BaseController.extend("nus.edu.sg.opwrequest.controller.OpwDetailView", {
		formatter: Formatter,


		onInit: function () {
			this.oOwnerComponent = this.getOwnerComponent();
			this.oRouter = this.oOwnerComponent.getRouter();
			this.oModel = this.oOwnerComponent.getModel();

			if (this.oRouter) {
				if (this.oRouter.getRoute("detail")) {
					//handling navigation for detail page
					this.oRouter.getRoute("detail").attachPatternMatched(this._onProjectMatched, this);
					// this.oLocalStorage = this.getComponentModel("localStorage");
				}
				if (this.oRouter.getRoute("taskdetail")) {
					//handling navigation for the task detail page
					this.oRouter.getRoute("taskdetail").attachPatternMatched(this._taskInboxLoad, this);
				}
				if (this.oRouter.getRoute("displaydetail")) {
					this.oRouter.getRoute("displaydetail").attachPatternMatched(this._onClaimReportMatched, this);
				}

				if (this.oRouter.getRoute("displayofn")) {
					this.oRouter.getRoute("displayofn").attachPatternMatched(this._onClaimReportofn, this);
				}
			}
		},

		/**
		 * Invoke at every point of Project Navigation
		 */
		_onProjectMatched: function (oEvent) {
			//attach the press event to the fiori launchpad back button
			if (sap.ui.getCore().byId("backBtn")) {
				sap.ui.getCore().byId("backBtn").attachBrowserEvent("click", this._flpBackBtn, this);
			}

			if (sap.ushell) {
				sap.ushell.Container.attachLogoutEvent(function (oLogOff) {
					this._fnRequestLockHandling();
				}.bind(this), false);
			}
			this._project = oEvent.getParameter("arguments").project || this._project || "0";
			this._fnInitializeAppModel();
			this.viaRequestorForm = true;
			this.firstTimeUnlockRequest = false;
			this.unLockstop = true;
		},
		_fnInitializeAppModel: function () {
			this.showBusyIndicator();
			this.AppModel = this.getComponentModel("AppModel");
			var oAppModel = this.setComponentModel("AppModel");
			oAppModel.setData(AppConstant);
			this.AppModel = oAppModel;
			this._fnClearAppModel();
			// this.generateTokenForLoggedInUser();
			this.getUserDetails();
			this.AppModel.setProperty("/showValidMessage", false);
			this.AppModel.setProperty("/showChangeReqMessage", false);
			this.AppModel.setProperty("/showCompleteMessage", false);
			this.AppModel.setProperty("/isadminDetailsEditAllowed", false);
			this.AppModel.setProperty("/isWbsChangeAllowed", false);
		},

		_onClaimReportMatched: function (oEvent) {
			//attach the press event to the fiori launchpad back button
			if (sap.ui.getCore().byId("backBtn")) {
				sap.ui.getCore().byId("backBtn").attachBrowserEvent("click", this._flpBackBtn, this);
			}
			this._project = oEvent.getParameter("arguments").project || this._project || "0";
			this.viaClaimReport = true;
			this._fnInitializeAppModel();
			Utility._fnAppModelSetProperty(this, "/cwsRequest/createCWSRequest", []); // Clear cwrequest model
		},

		_onClaimReportofn: function (oEvent) {
			if (sap.ui.getCore().byId("backBtn")) {
				sap.ui.getCore().byId("backBtn").attachBrowserEvent("click", this._flpBackBtn, this);
			}
			this._project = oEvent.getParameter("arguments").project || this._project || "0";
			this.viaClaimofn = true;
			this._fnInitializeAppModel();
			Utility._fnAppModelSetProperty(this, "/cwsRequest/createCWSRequest", []);
		},

		_fnRefreshAssistance: function (assistanceData) {
			// var oView = this.getView();
			// var CwsSrvModel = this.getComponentModel("CwsSrvModel");
			var CatalogSrvModel = this.getComponentModel("CatalogSrvModel");
			// var reqUniqueId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID");

			var orFilter = [],
				aFilter = [];
			if (assistanceData.length > 0) {
				jQuery.sap.each(assistanceData, function (i, element) {
					orFilter.push(new sap.ui.model.Filter("ULU_C", FilterOperator.EQ, element.STAFF_ULU));
					orFilter.push(new sap.ui.model.Filter("FDLU_C", FilterOperator.EQ, element.STAFF_FDLU));
				});
				aFilter.push(new sap.ui.model.Filter(orFilter, false));
			}

			CatalogSrvModel.read(Config.dbOperations.uluFdluDetails, {
				filters: aFilter,
				success: function (oData) {
					if (oData.results.length) {
						var idx;
						jQuery.sap.each(assistanceData, function (i, element) {
							idx = oData.results.findIndex(x => x.ULU_C === element.STAFF_ULU);
							element.STAFF_ULU_T = oData.results[idx].ULU_T;
							element.isFdluEnabled = Boolean(element.STAFF_ULU_T);

							idx = oData.results.findIndex(x => x.FDLU_C === element.STAFF_FDLU);
							element.STAFF_FDLU_T = oData.results[idx].FDLU_T;
						});
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/assistanceList", (assistanceData) ? assistanceData : []);
					}
				}.bind(this),
				error: function (oError) {

				}
			});
		},
		_fnRefreshAttachment: function () {
			// var oView = this.getView();
			this.AppModel.setProperty("/cwsRequest/validationRequest/cbDoctypeVState", ValueState.None);
			this.AppModel.setProperty("/cwsRequest/validationRequest/cbDoctypeVStateText", "");
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/attachmentTypeDesc", "");
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/attachmentType", "");
			this.AppModel.setProperty("/fileName", "");
			this.AppModel.setProperty("/visfileName", false);
			var oSubmission = this.AppModel.getProperty("/oRequestHistory");
			var catalogSrvModel = this.oOwnerComponent.getModel("CatalogSrvModel");
			var oReqUniqueId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID");
			var aFilter = [];

			var andFilter = [];
			andFilter.push(new sap.ui.model.Filter("SOURCE_TYPE", FilterOperator.EQ, '144'));
			andFilter.push(new Filter("IS_DELETED", FilterOperator.EQ, 'N'));

			if (oSubmission && oSubmission.length > 1) {
				var orFilter = [];
				for (var i = 0; i < oSubmission.length; i++) {
					orFilter.push(new sap.ui.model.Filter("REFERENCE_ID", FilterOperator.EQ, oSubmission[i].reqUniqueId));
				}
				andFilter.push(new sap.ui.model.Filter(orFilter, false));
			} else {
				andFilter.push(new sap.ui.model.Filter("REFERENCE_ID", FilterOperator.EQ, oReqUniqueId));
			}

			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			if (this.AppModel.getProperty("/oCopyMode") === "Copied") {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/attachmentList/results", []);
			} else {
				catalogSrvModel.read(Config.dbOperations.attachmentsView, {
					filters: aFilter,
					success: function (oData) {
						if (oData.results.length) {
							this.AppModel.setProperty("/oSyncAttach", false);
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/attachmentList", oData);
						} else {
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/attachmentList/results", []);
						}
					}.bind(this),
					error: function (oError) {

					}
				});
			}
		},

		// Begin of change - CCEV3364
		_bindItemProgramManager: function (aUluFdluFilterGroup) {
			// var sPath = "/EclaimsApprovalMatrixViews";
			var oStaffUserGroupFilter = new Filter("STAFF_USER_GRP", FilterOperator.EQ, 'CW_PROGRAM_MANAGER'),
				oProcessCode = new Filter("CLAIM_TYPE", FilterOperator.EQ, '203'),
				oItemTemplate = new sap.ui.core.ListItem({
					text: "{CwsSrvModel>FULL_NM}",
					key: "{CwsSrvModel>STAFF_ID}"
				}),
				dToday = new Date(),
				iMonth = parseInt(dToday.getMonth()) + 1,
				iMonth = iMonth.toString().length === 1 ? "0" + iMonth : iMonth,
				iDate = dToday.getDate(),
				iDate = iDate.toString().length === 1 ? "0" + iDate : iDate,
				dFormattedToday = dToday.getFullYear() + "-" + iMonth + "-" + iDate + "T15:59:59Z",
				oApmValidFrom = new Filter("APM_VALID_FROM", FilterOperator.LE, dFormattedToday),
				oApmValidTo = new Filter("APM_VALID_TO", FilterOperator.GE, dFormattedToday),
				oCwdProgramManager = this.byId("idCwDProgramManager"),
				aFilters = [],
				oSorter = new sap.ui.model.Sorter({
					path: "FULL_NM",
					descending: true
				});
			if (!aUluFdluFilterGroup) {
				var iFDLU = this.AppModel.getProperty("/cwsRequest/createCWSRequest/FDLU"),
					iULU = this.AppModel.getProperty("/cwsRequest/createCWSRequest/ULU"),
					oFDLUFilter = new Filter("FDLU", FilterOperator.EQ, iFDLU),
					oULUFilter = new Filter("ULU", FilterOperator.EQ, iULU),
					oULUAllFilter = new Filter("ULU", FilterOperator.EQ, "ALL"),
					oFdluAllFilter = new Filter("FDLU", FilterOperator.EQ, "ALL"),
					aAllFdluFilterGroup = new Filter({
						filters: [oULUFilter, oFDLUFilter],
						and: true
					}),
					aUluFdluFilterGroup = new Filter({
						filters: [oULUAllFilter, oFdluAllFilter],
						and: true
					}),
					aAllUluFilterGroup = new Filter({
						filters: [oULUFilter, oFdluAllFilter],
						and: true
					}),
					aFilterGroup = new Filter({
						filters: [aAllFdluFilterGroup, aUluFdluFilterGroup, aAllUluFilterGroup],
						and: false
					});
				aUluFdluFilterGroup = aFilterGroup;
			}
			oCwdProgramManager.setValue("");
			aFilters.push(oApmValidFrom, oApmValidTo, oProcessCode, aUluFdluFilterGroup, oStaffUserGroupFilter);
			oCwdProgramManager.setBusy(true);
			var oCatalogSrvModel = this.getComponentModel("CatalogSrvModel");

			Services._readDataUsingOdataModel(Config.dbOperations.approverMatrixView, oCatalogSrvModel, this, aFilters, function (oData) {
				var aProgramManagersList = [{
					STAFF_ID: "Default",
					FULL_NM: "Pool of Program Managers"
				}];
				if (oData.results.length > 0) {
					oData.results.forEach(function (oProgramManagerList) {
						aProgramManagersList.push(oProgramManagerList);
					});
				}
				this.AppModel.setProperty("/ProgramManagerData", aProgramManagersList);
				this._displayCwdProgramManager();
			}.bind(this));
		},
		_displayCwdProgramManager: function () {
			var aProcessParticipantFilter = [],
				oRefId = new Filter("REFERENCE_ID", FilterOperator.EQ, this._project.split("'")[1]),
				oIsNoDeleted = new Filter("IS_DELETED", FilterOperator.EQ, "N"),
				oUserDesignation = new Filter("USER_DESIGNATION", FilterOperator.EQ, "CW_PROGRAM_MANAGER"),
				oProgramManager = this.byId("idCwDProgramManager"),
				CatalogSrvModel = this.getComponentModel("CatalogSrvModel"),
				// sPath = "/ProcessParticipantss",
				aProgramManagersList = this.AppModel.getProperty("/ProgramManagerData"),
				oRequestData = this.AppModel.getProperty("/cwsRequest/createCWSRequest");

			this.AppModel.setProperty("/APPROVED_BY", "");
			this.AppModel.setProperty("/APPROVED_BY_FULLNM", "");
			this.AppModel.setProperty("/cwsRequest/Program_Manager", []);
			aProcessParticipantFilter.push(oRefId, oIsNoDeleted, oUserDesignation);
			CatalogSrvModel.read(Config.dbOperations.processParticipants, {
				filters: aProcessParticipantFilter,
				success: function (oData) {
					if (oData.results.length > 0) {
						this.AppModel.setProperty("/cwsRequest/Program_Manager", oData.results);
						var oProgramManagerItem = {
							"STAFF_FULL_NAME": oData.results[0].STAFF_FULL_NAME,
							"STAFF_ID": oData.results[0].STAFF_ID,
							"ULU": "",
							"FDLU": "",
							"NUSNET_ID": oData.results[0].NUSNET_ID,
							"PPNT_ID": this.AppModel.getProperty("/cwsRequest/Program_Manager")[0].PPNT_ID
						},
							aProgramManagers = [];
						aProgramManagers.push(oProgramManagerItem);
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/SELECTED_PROGRAM_MGR", aProgramManagers);
						oProgramManager.setSelectedKey(oData.results[0].STAFF_ID);
						//if the staff id is not present, default select the pool of program manager
						if (!oProgramManager.getValue()) {
							oProgramManager.setSelectedKey(aProgramManagersList[0].STAFF_ID);
						}
						oProgramManager.setBusy(false);
					} else {
						oProgramManager.setSelectedKey(aProgramManagersList[0].STAFF_ID);
						oProgramManager.setBusy(false);
					}
					this._getApproverDetails(oRequestData);
				}.bind(this),
				error: function (oError) {
					oProgramManager.setBusy(false);
				}
			});
		},
		// End of change - CCEV3364

		onPressSyncAttach: function () {
			this.lastSuccessRun = new Date();
			try {
				this.showBusyIndicator();
				var draftId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID");
				var oProcessCode = this.AppModel.getProperty("/cwsRequest/createCWSRequest/PROCESS_CODE");

				var oParameter = {
					draftId: draftId,
					processCode: oProcessCode,
					massAttachmentId: "NA"
				};

				var oHeaders = Formatter._amendHeaderToken(this);
				var serviceUrl = Config.dbOperations.syncAttachment;
				Services._loadDataAttachment(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
					oData = oData.getSource().getData();
					if (oData.attachmentFiles && oData.attachmentFiles[0].status === "S") {
						this._fnRefreshAttachment();
						this.hideBusyIndicator();
					} else {
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/attachmentList/results", []);
						var msg = oData.message;
						MessageBox.error(msg);
						this.hideBusyIndicator();
					}
				}.bind(this));
			} catch (oError) {
				this.hideBusyIndicator();
			}

		},

		handleFileSizeExceed: function () {
			return MessageBox.error(this.getI18n("CwsRequest.Attachments.Note2"));
		},
		/**
		 * Frame Data For Attachment Upload
		 */
		frameDataForAttachmentUpload: function (oEvent) {
			var draftId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID");
			var processCode = this.AppModel.getProperty("/cwsRequest/createCWSRequest/PROCESS_CODE");
			var attachmentTypeDesc = this.AppModel.getProperty("/cwsRequest/createCWSRequest/attachmentTypeDesc");
			var attachmentType = this.AppModel.getProperty("/cwsRequest/createCWSRequest/attachmentType");
			if (attachmentType === "ATT04") {
				attachmentTypeDesc = this.AppModel.getProperty("/cwsRequest/createCWSRequest/otherAttachmentName");
			}
			var file = oEvent.getSource().oFileUpload.files[0];
			if ("/^[!@#$%^&*()_+\-=\[\]{};':\\|,.<>\/?]*$/".indexOf(file.name.charAt(0)) >= 0) {
				this.hideBusyIndicator();
				return MessageBox.error(this.getI18n("CwsRequest.Attachments.Note3"));
			}

			if (file.size > 5000000) {
				this.hideBusyIndicator();
				return MessageBox.error(this.getI18n("CwsRequest.Attachments.Note2"));
			}
			var form = new FormData();
			form.append("files", file, file.name);
			form.append("processCode", processCode);
			form.append("draftId", draftId);
			form.append("fileName", file.name);
			form.append("attachmentType", attachmentTypeDesc);
			return form;
		},

		onUploadFile: function (oEvent) {
			var oView = this.getView(),
				attachmentType = this.AppModel.getProperty("/cwsRequest/createCWSRequest/attachmentType"),
				aValidationMessages = this.AppModel.getProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages"); //Added CCEV3364 - Donot upload file if there is any error in message model
			// Begin of change - CCEV3364
			if (aValidationMessages.length > 0) {
				this.onPressErrorMessages();
				return;
			}
			// End of change - CCEV3364
			if (attachmentType) {
				this.AppModel.setProperty("/cwsRequest/validationRequest/cbDoctypeVState", ValueState.None);
				this.onUploadChange();
			} else {
				this.AppModel.setProperty("/cwsRequest/validationRequest/cbDoctypeVState", ValueState.Error);
				this.AppModel.setProperty("/cwsRequest/validationRequest/cbDoctypeVStateText", this.getI18n("CwsRequest.AttachmnentType.Message"));
			}
		},

		onChangeFileUpload: function (oEvent) {
			var oFiles = oEvent.getSource();
			var file = oFiles.oFileUpload.files[0];

			// Begin of change - CCEV3364 - added validation of special character in file name
			var bValidateFileError = false;
			bValidateFileError = this._checkFileNameSpecialChar(file);
			if (bValidateFileError) {
				//Update message model with file name validation
				var aValidation = [];
				aValidation.push(Validation._formatMessageList("Error", "File Upload Error",
					this.getI18n("CwsRequest.Attachments.FileNameValidation1")));
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", aValidation);
				this.onPressErrorMessages();
				//Hide busy indicator and display message box validation
				this.hideBusyIndicator();
				return;
			}
			// End of change - CCEV3364
			this.AppModel.setProperty("/fileName", file.name);
			this.AppModel.setProperty("/visfileName", true);
		},

		/**
		 * Check special character in file name
		 * oFile{object} - File upload data
		 */
		_checkFileNameSpecialChar: function (oFile) {
			let sSplChar = /[!@#$%^&*()+\=\[\]{};':"\\|,.<>\/?]+/,
				bContainsSplChar = false,
				aFileName = oFile.name.split("."); //Split the filename with name and extension separate.
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", []);
			if (aFileName.length > 2) { //validation for "." character
				bContainsSplChar = true;
			} else {
				if (sSplChar.test(aFileName[0])) { //Validation for special characters.
					bContainsSplChar = true;
				}
			}
			return bContainsSplChar;
		},

		onUploadChange: function () {
			this.showBusyIndicator();
			var serviceUrl = Config.dbOperations.uploadAttachment;
			var oView = this.getView(),
				oFiles = sap.ui.core.Fragment.byId(oView.getId(), "fileUploader");
			var draftId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID");
			var oProcessCode = this.AppModel.getProperty("/cwsRequest/createCWSRequest/PROCESS_CODE");
			var attachmentTypeDesc = this.AppModel.getProperty("/cwsRequest/createCWSRequest/attachmentTypeDesc");
			var attachmentType = this.AppModel.getProperty("/cwsRequest/createCWSRequest/attachmentType");

			if (attachmentType === "ATT04") {
				attachmentTypeDesc = this.AppModel.getProperty("/cwsRequest/createCWSRequest/otherAttachmentName");
			}
			if (oFiles.oFileUpload.files.length && attachmentType) {
				this.showBusyIndicator();
				var file = oFiles.oFileUpload.files[0];
				if (file.size > 5000000) {
					this.hideBusyIndicator();
					return MessageBox.error("Maximum size allowed for each attachment is 5 MB.");
				}
				var form = new FormData();
				form.append("files", file, file.name);
				form.append("processCode", oProcessCode);
				form.append("draftId", draftId);
				form.append("fileName", file.name);
				form.append("attachmentType", attachmentTypeDesc);
				//added role as well
				var role = this.AppModel.getProperty("/userRole");
				form.append("role", role);
				var oHeaders = Utility._headerToken(this);
				delete oHeaders["Content-Type"];
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
						var oResponse = JSON.parse(response);
						if (oResponse.status === "S") {
							this._fnRefreshAttachment();
							oFiles.clear();
						} else {
							this.handleErrorDialog(response);
						}
					}.bind(this))
					.fail(function (response) {
						this.handleErrorDialog(response);
					}.bind(this))
					.always(function () {
						this.hideBusyIndicator();
					}.bind(this));
			} else {
				this.hideBusyIndicator();
				return MessageToast.show("Please browse & select the file to upload.");
			}
		},
		handlefileTypemismatch: function (oEvent) {
			return MessageBox.error("Only jpg, jpeg, png, pdf, xls, xlsx file extensions allowed");
		},
		handleFilenameLength: function (oEvent) {
			return MessageBox.error("Filename should contain 100 characters only.");
		},
		handleUploadComplete: function () {
			this._fnRefreshAttachment();
		},
		handleUploadPress: function (oEvent) {
			// var draftId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/draftId");
			// var claimType = this.AppModel.getProperty("/cwsRequest/createCWSRequest/claimType");
			// var oFileUploader = this.byId("fileUploader");
			// if (!oFileUploader.getValue()) {
			// 	MessageToast.show("Choose a file first");
			// 	return;
			// }

		},
		onUploadDocument: function (oEvent) {
			var oUploader = this.getView().byId("UploadSet");
			var aIncompletedItems = oUploader.getIncompleteItems();
			var serviceUrl = Config.dbOperations.uploadAttachment;

			for (var t = 0; t < aIncompletedItems.length; t++) {
				var oIncompletedItems = aIncompletedItems[t];

			}
		},

		_flpBackBtn: function (oEvent) {
			var isFlpBackButtonPressed = this.AppModel.getProperty("/isFlpBackButtonPressed");
			var presisttabkey = this.AppModel.getProperty("/prevSelectedKeyOfIconTabBar");
			var Status = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_STATUS");
			if (isFlpBackButtonPressed != 'Y') {
				if (Status === "31" || Status === "44" || Status === "45" || Status === "46") {
					var saveSource = 'onCloseSaveCall';
					this.onPressSaveDraftRequest(saveSource, null, false);
				}
				this.AppModel.setProperty("/isFlpBackButtonPressed", 'Y');
			}
			if ((this.viaRequestorForm || this.viaInbox) && !this.firstTimeUnlockRequest) {
				this.firstTimeUnlockRequest = true;
				this._fnRequestLockHandling();
			}
			this.runAutoSave = false; //stop auto save
			this._fnClearLocal();
		},

		_taskInboxLoad: function (oEvent) {
			//attach the press event to the fiori launchpad back button
			if (sap.ui.getCore().byId("backBtn")) {
				sap.ui.getCore().byId("backBtn").attachBrowserEvent("click", this._flpBackBtn, this);
			}
			sap.ushell.Container.attachLogoutEvent(function (oLogOff) {
				this._fnRequestLockHandling();
			}.bind(this), false);
			//get draft Id
			this._project = oEvent.getParameter("arguments").project || this._project || "0";
			this.taskId = oEvent.getParameter("arguments").taskId;
			this.taskName = oEvent.getParameter("arguments").taskName;
			this.viaInbox = true;
			this._fnInitializeAppModel();
			this.firstTimeUnlockRequest = false;
			this.unLockstop = true;
		},

		getUserDetails: function () {
			Services.getUserInfoDetails(
				this,
				function (oRetData) {
					Utility._assignTokenAndUserInfo(oRetData.getUserDetails, this);
					this._fetchAuthToken();
				}.bind(this)
			);
		},

		// generateTokenForLoggedInUser: function () {
		// 	Services.fetchLoggedUserToken(this, function (oRetData) {
		// 		Utility._assignTokenAndUserInfo(oRetData, this);
		// 		this._fetchAuthToken();
		// 	}.bind(this));

		// },
		_fetchAuthToken: function () {
			var oView = this.getView();
			var oObjectPageLayout = oView.byId("objPgLyoutDetlScrn");
			var oSectionToSelect = oView.byId("basic"); // Replace with the actual section ID you want to select

			if (oSectionToSelect) {
				oObjectPageLayout.setSelectedSection(oSectionToSelect);
			}
			// let oDataModel = this.getComponentModel("CwsSrvModel");
			this.AppModel.setProperty("/oWBSDeletion", []);
			if (this.viaInbox) {
				this._fnTaskidStatus();
			} else if (this._project !== "NEW") {
				this._fnGetOpwnRequestData();
			} else {
				this._fnHandleNewRequest();
			}
			this.hideBusyIndicator();
			this.AppModel.setProperty("/oSyncAttach", false);

			// var serviceName = Config.dbOperations.metadataClaims;
			// var oHeaders = Utility._headerToken(this);
			// // var oHeaders = Formatter._amendHeaderToken(this);
			// var oDataModel = new sap.ui.model.odata.v2.ODataModel({
			// 	serviceUrl: serviceName,
			// 	headers: oHeaders
			// });
			// oDataModel.setUseBatch(false);
			// oDataModel.metadataLoaded().then(function () {
			// 	this.getOwnerComponent().setModel(oDataModel, "CwsSrvModel");
			// 	/*if (localStorage) {
			// 		var myValue = localStorage.getItem("New_DraftID");
			// 		if (myValue) {
			// 			this._project = "cwsRequestViews('" + myValue + "')";
			// 		}
			// 	}*/
			// 	this.AppModel.setProperty("/oWBSDeletion", []);
			// 	if (this.viaInbox) {
			// 		this._fnTaskidStatus(oDataModel);
			// 	} else if (this._project !== "NEW") {
			// 		this._fnGetOpwnRequestData(oDataModel);
			// 	} else {
			// 		this._fnHandleNewRequest();
			// 	}
			// 	this.hideBusyIndicator();
			// 	this.AppModel.setProperty("/oSyncAttach", false);
			// }.bind(this));
		},

		_fnTaskidStatus: function () {
			if (this.taskId && this.viaInbox) {
				this.AppModel.setProperty("/oTaskDetails", []);
				var CatalogSrvModel = this.getComponentModel("CatalogSrvModel");
				var filters = Utility._generateFilter("TASK_INST_ID", [this.taskId]);
				Services._readDataUsingOdataModel(Config.dbOperations.taskDetails, CatalogSrvModel, this, filters, function (oData) {
					var oData = oData.results;
					if (oData.length > 0) {
						this.AppModel.setProperty("/oTaskDetails", oData);
						this._fnGetOpwnRequestData();
						var oMsg = this._fnshowTaskError(oData[0]);
						if (oMsg && oMsg !== "view") {
							Utility._fnErrorDialog(this, oMsg, function () {
								Utility._fnCrossAppNavigationToInbox();
							}.bind(this));
						}
					}
				}.bind(this));
			}
		},

		_fnshowTaskError: function (data) {
			var oMsg = "";
			if (data.TASK_STATUS === "97" && data.TASK_NAME !== this.taskName) {
				oMsg = "This task is no longer Active, the requestor has retracted this request, hence you'll be redirected to main page.";
			}

			if (data.TASK_STATUS === "99") {
				oMsg = "This task is no longer active";
			}

			if (data.TASK_STATUS === "97" && data.TASK_NAME === this.taskName) {
				oMsg = "view";
				this.AppModel.setProperty("/showRejectButton", false);
				this.AppModel.setProperty("/showApproveButton", false);
				this.AppModel.setProperty("/showEditButton", false);
				this.AppModel.setProperty("/showCompleteMessage", true);
				Utility._fnAppModelSetProperty(this, "/isClaimLocked", false);
				Utility._fnAppModelSetProperty(this, "/isClaimLockedMessage", "");
			}

			return oMsg;
		},

		_handleAutoSave: function () {
			this.autoSaveTrigger = new sap.ui.core.IntervalTrigger();
			//set the interval of 3 mins between auto save
			this.autoSaveTrigger.setInterval(180000);
			// this.autoSaveTrigger.setInterval(100);
			this.autoSaveTrigger.addListener(function () {
				var draftID = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID");
				// if (draftID)
				// localStorage.setItem("New_DraftID", draftID);
				if (this.runAutoSave && draftID) {
					if (Utility.checkForLastRun(this.lastSuccessRun)) {
						this.AppModel.setProperty("/oAutosave", "AutoSave");
						this.onPressSaveDraftRequest("Save", null, false);
					}
				} else {
					return;
				}
			}.bind(this));
		},
		/**
		 * Handle New Request Submission
		 */
		_fnHandleNewRequest: function () {
			var userRole = this.AppModel.getProperty("/userRole");
			var staffId = this.AppModel.getProperty("/loggedInUserStfNumber");
			var loggedInUserNid = this.AppModel.getProperty("/primaryAssigment/NUSNET_ID");
			var selectedStaffNid = this.AppModel.getProperty("/cwsRequest/createCWSRequest/STAFF_NUSNET_ID");
			var selectedsid = this.AppModel.getProperty("/cwsRequest/createCWSRequest/STAFF_ID");
			var concurrentStaffId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/CONCURRENT_STAFF_ID");
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", []);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/attachmentList/results", []);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/LOCATION", "L");
			this._fnFetchUserDetailFromChrsJobInfo(selectedsid, concurrentStaffId);
			// this._fnFetchLoginUserDetail(selectedsid);
			this.initializeModel(this._project);
		},
		/**
		 * Retrieve CWS Request Data
		 */
		_fnGetOpwnRequestData: function () {
			this.showBusyIndicator();
			var cwsSrvModel = this.getComponentModel("CwsSrvModel");
			// var requestData = cwsSrvModel.getProperty("/" + this._project);
			cwsSrvModel.read("/" + this._project, {
				urlParameters: {
					"$expand": "CwsAssistanceDetails,CwsPaymentsDetails,CwsYearSplitDetails,RemarksDataDetails,CwsWbsDataDetails"
				},
				success: function (oData) {
					this.setOpwnRequestData(oData);
				}.bind(this),
				error: function (oError) { }
			});

		},
		/**
		 * Set CWS Request data upon retrieval
		 */
		setOpwnRequestData: function (requestData) {
			this.AppModel.setProperty("/cwsRequest/createCWSRequest", requestData);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", []);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/paymentList", (requestData.CwsPaymentsDetails && requestData.CwsPaymentsDetails
				.results) ? requestData.CwsPaymentsDetails.results : []);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/receivedPaymentList", []);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/durationSplitList", (requestData.CwsYearSplitDetails && requestData.CwsYearSplitDetails
				.results) ? requestData.CwsYearSplitDetails.results : []);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/REMARKS", (requestData.RemarksDataDetails && requestData.RemarksDataDetails
				.results) ? requestData.RemarksDataDetails.results : []);
			// this.onStaffphotoLoad();
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/statusDisplay", requestData.STATUS_ALIAS);

			// this.AppModel.setProperty("/cwsRequest/createCWSRequest/taskConfigs", (requestData.TaskActionConfigViewDetails && requestData.TaskActionConfigViewDetails
			// 	.results) ? requestData.TaskActionConfigViewDetails.results : []);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/wbsList", (requestData.CwsWbsDataDetails && requestData.CwsWbsDataDetails
				.results) ? requestData.CwsWbsDataDetails.results : []);

			this._fnRefreshAssistance(requestData.CwsAssistanceDetails.results);

			this._fnRefreshAttachment();
			var oData = this.AppModel.getProperty("/cwsRequest/createCWSRequest/attachmentList");
			if (requestData.MASS_REF_UPLOAD_ID && requestData.MASS_REF_VAL && (!oData || oData.length === 0)) {
				this.AppModel.setProperty("/oSyncAttach", true);
			}
			this._fnFetchUserDetailFromChrsJobInfo(requestData.STAFF_ID, requestData.CONCURRENT_STAFF_ID, requestData);
			this.initializeModel(this._project, true);

			if (this.AppModel.getProperty("/cwsRequest/createCWSRequest/wbsList").length === 0 && (requestData.STATUS_CODE === "31" ||
				requestData.STATUS_CODE === "46")) {
				this.onAddWbsElement();
			} else if (this.AppModel.getProperty("/cwsRequest/createCWSRequest/wbsList").length > 0) {
				var oData = this.AppModel.getProperty("/cwsRequest/createCWSRequest/wbsList");
				// var sCont = oData.filter(val => val.IS_DELETED !== "Y");
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/wbsList", oData);
				this._fnWbsDesc();
			}
			//Manage Payment List Details
			this.managePaymentDetails();

			// Payment section
			this.AppModel.setProperty("/paymenticonTabBarSelectedKey", "AgreedPayments");

			this.AppModel.setProperty("/oSourceCall", "");

			//handling locking
			if ((requestData.LOCKED_BY_USER_NID !== this.AppModel.getProperty("/loggedInUserStfNumber")) && requestData.IS_LOCKED === "X") {
				Utility._fnAppModelSetProperty(this, "/isClaimLocked", true);
				var sfilters = new Filter({
					filters: [new Filter("SF_STF_NUMBER", FilterOperator.EQ, requestData.LOCKED_BY_USER_NID)]
				});
				// var CwsSrvModel = this.oOwnerComponent.getModel("CwsSrvModel");
				var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
				oCatalogSrvModel.read(Config.dbOperations.userLookup, {
					filters: [sfilters],
					success: function (oData) {
						if (oData.results.length) {
							var name = oData.results[0].FULL_NM + "(" + oData.results[0].NUSNET_ID + ")";
							Utility._fnAppModelSetProperty(this, "/isClaimLockedMessage",
								"Request is already locked by the user".concat(" : ", name));
						} else {
							Utility._fnAppModelSetProperty(this, "/isClaimLockedMessage",
								"Request is already locked by the user".concat(" : ", requestData.LOCKED_BY_USER_NID));
						}
					}.bind(this)
				});
			} else {
				Utility._fnAppModelSetProperty(this, "/isClaimLocked", false);
				Utility._fnAppModelSetProperty(this, "/isClaimLockedMessage", "");
			}

			if (this.AppModel.getProperty("/cwsRequest/createCWSRequest/showCompleteMessage")) {
				Utility._fnAppModelSetProperty(this, "/isClaimLocked", false);
				Utility._fnAppModelSetProperty(this, "/isClaimLockedMessage", "");
			}

			if (this.AppModel.getProperty("/oCopyMode") === "Copied") {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/REMARKS", []);
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/RemarksDataDetails", []);
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/CwsYearSplitDetails", []);
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/CwsPaymentsDetails", []);
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/receivedPaymentList", []);
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/attachmentList/results", []);
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/REQUEST_STATUS", "31");
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID", "");
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/REQUEST_ID", "");
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/statusDisplay", 'Draft');
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/MIGRATED", '');
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/SOURCE", '');
				this.AppModel.setProperty("/showSubmitButton", false);
				this.AppModel.setProperty("/isFormEditable", true);
				this.AppModel.setProperty("/showSaveButton", true);
				this.AppModel.setProperty("/showHistoryButton", false);
				this.AppModel.setProperty("/showRetractButton", false);
				this.AppModel.setProperty("/showWithdrawButton", false);
				this.AppModel.setProperty("/showCloseButton", false);

				$.each(this.AppModel.getProperty("/cwsRequest/createCWSRequest/durationSplitList"), function (idx, obj) {
					delete obj.SPLIT_ID;
					delete obj.REFERENCE_ID;
				}.bind(this));
				$.each(this.AppModel.getProperty("/cwsRequest/createCWSRequest/paymentList"), function (idx, obj) {
					delete obj.PAYMENT_ID;
					delete obj.REFERENCE_ID;
				}.bind(this));

				$.each(this.AppModel.getProperty("/cwsRequest/createCWSRequest/wbsList"), function (idx, obj) {
					delete obj.ID;
					delete obj.REFERENCE_ID;
				}.bind(this));

				this.onPressSaveDraftRequest("Save", null, false);
			}
			this.ocwsRequest = $.extend(true, {}, this.AppModel.getProperty("/cwsRequest/createCWSRequest"));

			var userRole = this.AppModel.getProperty("/userRole");
			//Handle Request locking
			Utility.handlingSession(this);
			var AppModel = this.AppModel.getProperty("/");
			if (userRole !== "CW_ESS" && !this.AppModel.getProperty("/showCompleteMessage")) {
				RequestLockHelper._handleLocking(this, this.getI18n("ClaimDetail.Lock"), AppModel.cwsRequest.createCWSRequest.REQ_UNIQUE_ID,
					Utility._fnHandleStaffId(this),
					function (oData) {
						if (oData.isError) {
							MessageBox.show(oData.message);
						}
					}.bind(this));
			}
			if (this.viaRequestorForm && this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_STATUS") === '31') {
				this.lastSuccessRun = new Date();
				this.runAutoSave = true;
				this._handleAutoSave();
			}

			//block the access for the user who already took action on the request or in future logged in user will be taking action
			//Matching task agents
			// var oMatchingAgents = 
			Utility._fnHandleTaskAgent(this, Utility._fnHandleStaffId(this), requestData.STAFF_ID, requestData.REQ_UNIQUE_ID,
				requestData.REQUEST_ID, this.AppModel.getProperty("/userRole"), requestData.PROCESS_CODE,function (taskAgentData) {
					var bTaskAgentFlag = (taskAgentData.length) ? taskAgentData[0].isMatchingStaff : false;
					var bMessage = (taskAgentData.length) ? taskAgentData[0].message : '';
					if (bTaskAgentFlag) {
						Utility.handleVisibilityForTaskAgent(this, false);
						MessageBox.error(bMessage)
					}
					// return {
					// 	bTaskAgentFlag: bTaskAgentFlag,
					// 	bMessage: bMessage
					// };
				}.bind(this));
			// if (oMatchingAgents.bTaskAgentFlag) {
			// 	Utility.handleVisibilityForTaskAgent(this, false);
			// 	MessageBox.error(oMatchingAgents.bMessage)
			// }
			this.hideBusyIndicator();
		},

		// Get Approver Details
		_getApproverDetails: function (oRequestData) {
			if (oRequestData.REQ_UNIQUE_ID) {
				var oCatalogSrvModel = this.getComponentModel("CatalogSrvModel"),
					sUrlParameters = "", //$select=TASK_COMPLETED_BY,TASK_COMPLETED_BY_NID
					sPath = Config.dbOperations.taskInboxView,
					aFilters = [];
				// aFilters.push(new Filter("TASK_NAME", FilterOperator.EQ, "CW_PROGRAM_MANAGER"));
				aFilters.push(new Filter("TASK_STATUS", FilterOperator.EQ, "97"));
				aFilters.push(new Filter("DRAFT_ID", FilterOperator.EQ, oRequestData.REQ_UNIQUE_ID));
				this.readODataCallWithParameters(oCatalogSrvModel, sPath, aFilters, sUrlParameters, function (oData) {
					this._getInstData(oData, oRequestData);
				}.bind(this));
			}
		},
		readODataCallWithParameters: function (oDataModel, sPath, aFilters, sUrlParameters, fnCallBack) {
			oDataModel.read(sPath, {
				urlParameters: sUrlParameters,
				filters: aFilters,
				success: function (oData) {
					fnCallBack(oData);
				}.bind(this),
				error: function (oError) { }
			});
		},
		_getInstData: function (oData, oRequestData) {
			var oProgramManager = this.byId("idCwDProgramManager"),
				aProgramManagersList = this.AppModel.getProperty("/ProgramManagerData");
			if (oData.results.length) {

				var aFilters = [],
					sUrlParameters = "$select=FULL_NM",
					oCwsSrvModel = this.oOwnerComponent.getModel("CwsSrvModel"),
					sPath = "/UserLookups",
					sIndexTask = oData.results.length - 1,
					sTaskCompletedBy = oData.results[sIndexTask].TASK_COMPLETED_BY,
					sTaskCompletedByNid = oData.results[sIndexTask].TASK_COMPLETED_BY_NID;
				if (oRequestData.REQUEST_STATUS === "38" || oRequestData.REQUEST_STATUS === "39") {
					this.AppModel.setProperty("/showApproverText", true);
				}
				if (sTaskCompletedBy === oProgramManager.getSelectedKey()) {
					this.AppModel.setProperty("/APPROVED_BY_FULLNM", "(" + oProgramManager.getValue() + ")");
					this.AppModel.setProperty("/APPROVED_BY", sTaskCompletedBy);
					this.AppModel.setProperty("/showApproverText", false);
					return;
				}
				aFilters.push(new Filter({
					filters: [new Filter("SF_STF_NUMBER", FilterOperator.EQ, sTaskCompletedBy)]
				}));
				this.readODataCallWithParameters(oCwsSrvModel, sPath, aFilters, sUrlParameters, function (oData) {
					if (oData.results.length) {
						this.AppModel.setProperty("/APPROVED_BY_FULLNM", "(" + oData.results[0].FULL_NM + ")");
						this.AppModel.setProperty("/APPROVED_BY", sTaskCompletedBy);
					} else {
						this.AppModel.setProperty("/APPROVED_BY_FULLNM", "");
						this.AppModel.setProperty("/APPROVED_BY", "");
					}
				}.bind(this));
			}
		},
		onSelectPaymentIconFilter: function (oEvent) {
			var sKey = oEvent.getParameter("selectedKey");
			this.AppModel.setProperty("/paymenticonTabBarSelectedKey", sKey);
			if (sKey === 'ReceivedPayments') {
				var oReceievdPayment = []
				var oRemuneration = this.AppModel.getProperty("/remunerationList");
				var oCont = this.AppModel.getProperty("/cwsRequest/createCWSRequest/CwsPaymentsDetails/results");
				oReceievdPayment = oRemuneration.filter(obj1 => oCont.some(obj2 => obj1.CONFIG_KEY === obj2.REMUNERATION_TYPE));
				this.AppModel.setProperty("/receivedPaymentRemType", oReceievdPayment);
				this.AppModel.refresh(true);
			}
		},

		/**
		 * Manage Payment List Population
		 */
		managePaymentDetails: function () {
			var paymentList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/paymentList");
			var oAgreedPaymentData = [],
				oReceivableData = [];
			jQuery.sap.each(paymentList, function (p, element) {
				element.BIZ_EXP_CRNCY = element.CURRENCY;
			}.bind(this));

			jQuery.sap.each(paymentList, function (p, element) {
				element.isReceivable = (element.PAYMENT_TYPE === "A") ? false : true;
				//To-Do Handling for Approved Requests
			}.bind(this));

			jQuery.sap.each(paymentList, function (p, element) {
				if (element.PAYMENT_TYPE === "R") {
					oReceivableData.push(element);
				} else {
					oAgreedPaymentData.push(element);
				}
			}.bind(this));
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/paymentList", oAgreedPaymentData);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/receivedPaymentList", oReceivableData);

		},
		/**
		 * Handle Visibility of the UI Controls
		 */
		manageUIControls: function (sourceReq) {
			var copyMode = this.AppModel.getProperty("/oCopyMode");
			if (!copyMode || (copyMode && copyMode !== "Copied")) {
				this.onPressRequestHistory();
			}
			if (this.taskName) {
				this.AppModel.setProperty("/userRole", this.taskName);
			}
			this.AppModel.setProperty("/oPercentageVState", "None");
			this.AppModel.setProperty("/oStartdateEnabled", true);
			this.AppModel.setProperty("/oSetMinDate", null);
			this.AppModel.setProperty("/showSaveButton", (sourceReq === "NEW") ? true : false);
			this.AppModel.setProperty("/showSubmitButton", (sourceReq === "NEW") ? true : false);
			this.AppModel.setProperty("/showRejectButton", false);
			this.AppModel.setProperty("/showApproveButton", false);
			this.AppModel.setProperty("/showEditButton", false);
			this.AppModel.setProperty("/showUpdateButton", false);
			this.AppModel.setProperty("/showCancelButton", false);
			this.AppModel.setProperty("/showHistoryButton", false);
			this.AppModel.setProperty("/showDeleteButton", false);
			this.AppModel.setProperty("/showRetractButton", false);
			this.AppModel.setProperty("/showWithdrawButton", false);
			this.AppModel.setProperty("/showCloseButton", false);
			this.AppModel.setProperty("/showEditButtonApproved", false);
			this.AppModel.setProperty("/admitEdit", true);

			var odate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/END_DATE");

			this.AppModel.setProperty("/isFormEditable", (sourceReq === "NEW") ? true : false);
			var oRole = this.AppModel.getProperty("/userRole");
			var requestData = this.AppModel.getProperty("/cwsRequest/createCWSRequest");
			var isDeptOhrss = this.AppModel.getProperty("/isDeptOHRSS");
			if (this.viaInbox) {
				var oData = this.AppModel.getProperty("/oTaskDetails");
				this.AppModel.setProperty("/isFormEditable", false);
				if (requestData.REQUEST_STATUS === "42" || requestData.REQUEST_STATUS === "43" || requestData.REQUEST_STATUS === "40") {
					this.AppModel.setProperty("/showRejectButton", true);
					this.AppModel.setProperty("/showApproveButton", true);
				}
				this.AppModel.setProperty("/exitFullScreen", false);

				if ((requestData.SUBMITTED_BY === this.AppModel.getProperty("/loggedInUserStfNumber")) || (requestData.STAFF_ID === this.AppModel
					.getProperty("/loggedInUserStfNumber"))) {
					this.AppModel.setProperty("/showRejectButton", false);
					this.AppModel.setProperty("/showApproveButton", false);
					this.AppModel.setProperty("/showEditButton", false);
					this.AppModel.setProperty("/showValidMessage", true);
				}

				if (oData[0].TASK_STATUS === "97" && oData[0].TASK_NAME === this.taskName) {
					this.AppModel.setProperty("/showRejectButton", false);
					this.AppModel.setProperty("/showApproveButton", false);
					this.AppModel.setProperty("/showEditButton", false);
					this.AppModel.setProperty("/showCompleteMessage", true);
				}
			}
			if (this.viaRequestorForm) {
				if (this.AppModel.getProperty("/showValidMessage") === false) {
					if (requestData.REQUEST_STATUS === "38" && requestData.SUBMITTED_BY === this.AppModel.getProperty(
						"/loggedInUserStfNumber")) { // Approvedrequest
						this.AppModel.setProperty("/showEditButtonApproved", true);
						this.AppModel.setProperty("/showWithdrawButton", true);
					}

					if ((requestData.REQUEST_STATUS === "31" || requestData.REQUEST_STATUS === "46") && requestData.SUBMITTED_BY ===
						this.AppModel.getProperty("/loggedInUserStfNumber")) {
						this.AppModel.setProperty("/showDeleteButton", true);
					}
					if (requestData.STATUS_ALIAS !== "Draft" && requestData.SUBMISSION_TYPE !== 'U' && (requestData.REQUEST_STATUS === "41" ||
						requestData.REQUEST_STATUS === "44" ||
						requestData.REQUEST_STATUS === "45" ||
						requestData.REQUEST_STATUS === "46")) { //Submission type added for Release 2 
						this.AppModel.setProperty("/showEditButton", true);
						// this.AppModel.setProperty("/oEditKey", "A");
						// this.ocwsRequest = $.extend(true, {}, this.AppModel.getProperty("/cwsRequest/createCWSRequest"));
						// this.AppModel.setProperty("/showUpdateButton", true);
						// this.AppModel.setProperty("/isFormEditable", true);
					}

					if ((requestData.REQUEST_STATUS === "40" || requestData.REQUEST_STATUS === "42" || requestData.REQUEST_STATUS === "43") && this
						.viaInbox !==
						true && requestData.SUBMITTED_BY === this.AppModel.getProperty("/loggedInUserStfNumber")) { // Inprocess request
						this.AppModel.setProperty("/showRetractButton", true);
					}
					if ((oRole === "CW_PROGRAM_ADMIN" && requestData.REQUEST_STATUS === "38" && requestData.ULU === this.AppModel.getProperty(
						"/primaryAssigment/ULU_C") && requestData.FDLU === this.AppModel.getProperty("/primaryAssigment/FDLU_C")) || (isDeptOhrss &&
							requestData.REQUEST_STATUS === "38")) {
						this.AppModel.setProperty("/showEditButtonApproved", true);
						this.AppModel.setProperty("/showWithdrawButton", true);
						if (new Date() > odate) {
							this.AppModel.setProperty("/showCloseButton", true);
						}
					}

					if (isDeptOhrss) {
						var status = requestData.paymentList.find(function (element) {
							return element.PAYMENT_REQ_STATUS_ALIAS === "Paid";
						}.bind(this));

						if (status) {
							this.AppModel.setProperty("/admitEdit", false);
						}
					}
				}

				if (requestData.REQUEST_STATUS === "38") {
					this.AppModel.setProperty("/exitFullScreen", false);
					this.AppModel.setProperty("/showApproveButton", false);
					this.AppModel.setProperty("/showRejectButton", false);
				}

				if ((requestData.REQUEST_STATUS === '' || requestData.REQUEST_STATUS === '31' || requestData.REQUEST_STATUS ===
					'44' || requestData.REQUEST_STATUS === '45' || requestData.REQUEST_STATUS === '46') && (oRole === "CW_PROGRAM_ADMIN")) {
					this.AppModel.setProperty("/isFormEditable", true);
					this.AppModel.setProperty("/showSaveButton", true);
					this.AppModel.setProperty("/showSubmitButton", true);
				}
				var oMigrate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/MIGRATED");
				var oEndDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/END_DATE");
				if ((oMigrate === "MG" || oMigrate === "MC" || isDeptOhrss) && oEndDate <= new Date('2021-12-31')) {
					this.AppModel.setProperty("/showRetractButton", false);
					this.AppModel.setProperty("/showWithdrawButton", false);
					this.AppModel.setProperty("/showEditButtonApproved", false);
					this.AppModel.setProperty("/showDeleteButton", false);
					this.AppModel.setProperty("/showCloseButton", false);
					this.AppModel.setProperty("/isFormEditable", false);
				}
			}
			if (this.viaClaimReport || this.viaClaimofn) {
				this.AppModel.setProperty("/exitFullScreen", false);
				this.AppModel.setProperty("/closeColumn", false);
				this.AppModel.setProperty("/showRetractButton", false);
				this.AppModel.setProperty("/showWithdrawButton", false);
				this.AppModel.setProperty("/showEditButtonApproved", false);
				this.AppModel.setProperty("/showDeleteButton", false);
				this.AppModel.setProperty("/showCloseButton", false);
			}
		},

		fnHandlechangeRequest: function () {
			var oHistory = this.AppModel.getProperty("/oRequestHistory");
			var oStatus = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_STATUS");
			if (oHistory && oHistory.length > 0 && oStatus === "38") {
				var sValid = false,
					oData = this.AppModel.getProperty("/oRequestHistory");

				if (oData.length > 1) {
					for (let i = 0; i < oData.length; i++) {
						var request = oData[i];
						if (!(request.requestStatusCode === "38" || request.requestStatusCode === "49" || request.requestStatusCode === "35" || request.requestStatusCode ===
							"36" || request.requestStatusCode === "37" || request.requestStatusCode === "41")) {
							sValid = true;
						}
					}
					if (sValid) {
						this.AppModel.setProperty("/showWithdrawButton", false);
						this.AppModel.setProperty("/showEditButtonApproved", false);
						this.AppModel.setProperty("/showCloseButton", false);
						this.AppModel.setProperty("/showChangeReqMessage", true);
					}
				}
			}
		},

		_fnFetchUserDetailFromChrsJobInfo: function (nusNetId, concurrentStaffId, requestData) {
			// Need to enhance this method if engaging dept to modify in future
			// fetch 
			// var that = this,
			var sfilters;
			var CatalogSrvModel = this.oOwnerComponent.getModel("CatalogSrvModel");
			// var staffNusNetId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/STAFF_ID");
			// var filters = that.generateFilter("STF_NUMBER", [staffNusNetId]);

			if (concurrentStaffId) {
				sfilters = new Filter({
					filters: [new Filter("STF_NUMBER", FilterOperator.EQ, nusNetId),
					new Filter("SF_STF_NUMBER", FilterOperator.EQ, concurrentStaffId)
					],
					and: true
				});
			} else {
				sfilters = new Filter({
					filters: [new Filter("SF_STF_NUMBER", FilterOperator.EQ, nusNetId)]
				});
			}

			CatalogSrvModel.read(Config.dbOperations.activeInactiveUserLookup, {
				filters: [sfilters],
				success: function (oData) {
					if (oData.results.length) {
						jQuery.sap.each(oData.results, function (i, resultElement) {
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/FULL_NM", resultElement.FULL_NM);
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/STF_NUMBER", resultElement.STF_NUMBER);
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/DEPT_T", resultElement.FDLU_T);
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/DEPT_C", resultElement.FDLU_C);
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/FACULTY_T", resultElement.ULU_T);
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/FACULTY_C", resultElement.ULU_C);
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/EMP_GP_T", resultElement.EMP_GP_T);
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/EMP_GP_C", resultElement.EMP_GP_C);
							var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
								pattern: "d MMM, yyyy"
							});
							var dojDate = oDateFormat.format(new Date(resultElement.JOIN_DATE));
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/JOIN_DATE", dojDate);
							if (resultElement.LEAVING_DATE) {
								var eodDate = oDateFormat.format(new Date(resultElement.LEAVING_DATE));
								this.AppModel.setProperty("/cwsRequest/createCWSRequest/LEAVING_DATE", eodDate);
							} else {
								this.AppModel.setProperty("/cwsRequest/createCWSRequest/LEAVING_DATE", null);
							}
							// Services.fetchPhotoOfUser(that, resultElement.STF_NUMBER);
							if (resultElement.STF_NUMBER !== this.AppModel.getProperty("/loggedInUserStfNumber")) {
								Services.fetchPhotoOfUser(this, resultElement.STF_NUMBER);
							} else {
								this.AppModel.setProperty("/cwsRequest/createCWSRequest/Photo", this.AppModel.getProperty("/staffPhoto"));
							}

						}.bind(this));
						this.AppModel.setProperty("/isFdluEnabled", true);
						if (requestData && requestData.ULU && requestData.FDLU) {
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/ULU", requestData.ULU);
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/ULU_T", (requestData.ENG_ULU_T) ? requestData.ENG_ULU_T :
								requestData.ULU);
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/FDLU", requestData.FDLU);
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/FDLU_T", (requestData.ENG_FDLU_T) ? requestData.ENG_FDLU_T :
								requestData.FDLU);
						} else {
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/ULU", this.AppModel.getProperty("/primaryAssigment/ULU_C"));
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/ULU_T", this.AppModel.getProperty("/primaryAssigment/ULU_T"));
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/FDLU", this.AppModel.getProperty("/primaryAssigment/FDLU_C"));
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/FDLU_T", this.AppModel.getProperty("/primaryAssigment/FDLU_T"));
						}

					} else {
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/FULL_NM", '');
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/STF_NUMBER", '');
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/FDLU_T", '');
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/FDLU", '');
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/ULU_T", '');
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/ULU", '');
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/uluSelected", '');
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/uluSelectedCode", '');
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/fdluSelected", '');
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/fdluSelectedCode", '');
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/EMP_GP_T", '');
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/EMP_GP_C", '');
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/JOIN_DATE", '');
					}

					this._editProgramManager();
				}.bind(this)
			});

		},

		_fnFetchLoginUserDetail: function (nusNetId) {
			var that = this;
			// var CwsSrvModel = this.oOwnerComponent.getModel("CwsSrvModel");
			var filters = that.generateFilter("STF_NUMBER", [nusNetId]);
			var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
			oCatalogSrvModel.read(Config.dbOperations.userLookup, {
				filters: filters,
				success: function (oData) {
					if (oData.results.length) {
						// that.AppModel.setProperty("/cwsRequest/createCWSRequest/uluPrimary", oData.results[0].ULU_T);
						// that.AppModel.setProperty("/cwsRequest/createCWSRequest/uluPrimaryCode", oData.results[0].ULU_C);
						// that.AppModel.setProperty("/cwsRequest/createCWSRequest/fdluPrimary", oData.results[0].FDLU_T);
						// that.AppModel.setProperty("/cwsRequest/createCWSRequest/fdluPrimaryCode", oData.results[0].FDLU_C);

						that.AppModel.setProperty("/cwsRequest/createCWSRequest/DEPT_T", oData.results[0].FDLU_T);
						that.AppModel.setProperty("/cwsRequest/createCWSRequest/DEPT_C", oData.results[0].FDLU_C);
						that.AppModel.setProperty("/cwsRequest/createCWSRequest/FACULTY_T", oData.results[0].ULU_T);
						that.AppModel.setProperty("/cwsRequest/createCWSRequest/FACULTY_C", oData.results[0].ULU_C);
					}
				}
			});
		},

		initializeModel: function (sourceReq, isRetrieve) {
			var that = this;

			if (sourceReq === "NEW") {
				that.AppModel.setProperty("/cwsRequest/createCWSRequest/statusDisplay", "");
				that.AppModel.setProperty("/cwsRequest/createCWSRequest/moduleView", true);
				that.AppModel.setProperty("/cwsRequest/createCWSRequest/weeklyView", false);
				that.AppModel.setProperty("/cwsRequest/createCWSRequest/monthlyView", false);
				that.AppModel.setProperty("/cwsRequest/createCWSRequest/isBankDetailsMaintained", true);
				that.AppModel.setProperty("/claimRequest/statusDisplay", 'Draft');
				that.AppModel.setProperty("/cwsRequest/createCWSRequest/IS_WAIVED", "N");

				var month;
				var year;
				var ulu = this.AppModel.getProperty("/cwsRequest/createCWSRequest/uluSelectedCode");
				var fdlu = this.AppModel.getProperty("/cwsRequest/createCWSRequest/fdluSelectedCode");
				var saveSource = "initialViewLoadSave";
				this.onAddWbsElement();
				this.onPressAddPayment();
				if (this.viaRequestorForm) {
					this.runAutoSave = true;
					this._handleAutoSave();
				}
			}
			this.loadDataForDetailsView(sourceReq, isRetrieve);
			//Manage UI controls
			this.manageUIControls(sourceReq);
		},

		loadDataForDetailsView: function (sourceReq, isRetrieve) {
			Utility.retrieveRequestTypes(this, isRetrieve, function () {
				if (sourceReq === "NEW") {
					this.onPressSaveDraftRequest(sourceReq);
				}
			}.bind(this));
			Utility.retrieveLevyDetails(this, isRetrieve);
			Utility.retrieveLocations(this);
			Utility.retrieveWorkTypes(this);
			Utility.retrieveUnitType(this);
			// Utility.retrieveRemunerationType(this);
			Utility.retrieveAttachmentTypes(this);
			Utility.retrieveWaivers(this);
			Utility.retrievePaymentType(this);

			this.populateDurationList("S");
			this.populatePaymentYearList();
			this.populateUtilizationDays();
			this.populatePayment();
			this.populateMonth();
		},

		populateMonth: function () {
			var monthNames = this.getComponentModel("LocalData").getProperty("/monthNames");
			var oMonth = [],
				currentDate = new Date();
			var currentMonth = currentDate.getMonth();
			oMonth.push({
				"cKey": 0,
				"Month": monthNames[currentDate.getMonth()]
			});
			oMonth.push({
				"cKey": -1,
				"Month": monthNames[currentMonth - 1]
			});
			this.AppModel.setProperty("/months", oMonth)
		},
		onChangeMonth: function () {
			this.populatePayment();
		},

		onAction: function (oEvent) {
			var oCon = oEvent.getSource();
		},

		/**
		 * Add Form Layout
		 */
		addPaymentHeaderLayout: function () {
			var vLayout = this.getUIControl("paymentItemVLayout");
			this.paymentHeader = sap.ui.xmlfragment("PaymentHeaderLayout",
				"nus.edu.sg.opwrequest.view.fragments.detaillayout.PaymentHeader", this);
			vLayout.addContent(this.itemsHeader);
		},
		/**
		 * Add Form Layout
		 */
		addPaymentsDetailsLayout: function () {
			var vLayout = this.getUIControl("paymentItemVLayout");
			var fragmentId = "PaymentsFormDisplay";
			var fragmentPath = "nus.edu.sg.opwrequest.view.fragments.detaillayout.PaymentsFormDisplay";
			this.paymentsForm = sap.ui.xmlfragment(fragmentId, fragmentPath, this);
			vLayout.addContent(this.paymentsForm);
		},
		onSelectDocumentType: function (oEvent) {
			this.changeVState(oEvent);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/attachmentTypeDesc", oEvent.getParameter("value"));
		},
		/**
		 * On Select Request Type
		 */
		onSelectRequestType: function (oEvent) {
			this.lastSuccessRun = new Date();
			// var selectedIndx = oEvent.getParameter("selectedIndex");
			var selectedIndx = 0;
			var appModel = this.AppModel;
			appModel.setProperty("/cwsRequest/createCWSRequest/SUB_TYPE", "");

			if (this.AppModel.getProperty("/isRequestType") && selectedIndx !== "CW") {
				return MessageBox.error("Submission only for Consultation Work (CW)");
			} else {
				appModel.setProperty("/cwsRequest/createCWSRequest/REQUEST_TYPE", appModel.getProperty("/requestTypes/" + selectedIndx +
					"/CONFIG_KEY"));
				appModel.setProperty("/cwsRequest/createCWSRequest/REQUEST_TYPE_DESC", appModel.getProperty("/requestTypes/" + selectedIndx +
					"/CONFIG_VALUE"));
				appModel.setProperty("/cwsRequest/createCWSRequest/PROCESS_CODE", appModel.getProperty("/requestTypes/" + selectedIndx +
					"/REFERENCE_VALUE"));

				appModel.setProperty("/cwsRequest/validationRequest/requestTypeVState", ValueState.None);
				appModel.setProperty("/cwsRequest/validationRequest/subTypeVState", ValueState.None);

				Utility.retrieveSubTypes(this);
			}

		},

		onChangeSubType: function () {
			this.lastSuccessRun = new Date();
			this.populateUtilizationDays();
		},

		onPressNavigateToSelectDates: function (oEvent) {
			this.lastSuccessRun = new Date();
			this.AppModel.setProperty("/errorMessages/valueState/SelectPlanningDateFromCalendar/wbs", "None");
			//disabling the dates for the next dialog of planning calendar
			var aItemData = this.AppModel.getProperty("/cwsRequest/createCWSRequest/EclaimsItemDataDetails");
			var aDisabledDates = [];
			var aAlreadyPushedDisabledDates = [];
			for (var t = 0; t < aItemData.length; t++) {
				var oItem = aItemData[t];
				if (aAlreadyPushedDisabledDates.indexOf(oItem.CLAIM_START_DATE) < 0) {
					aDisabledDates.push({
						"startDate": new Date(oItem.CLAIM_START_DATE),
						"endDate": new Date(oItem.CLAIM_END_DATE)
					});
					aAlreadyPushedDisabledDates.push(oItem.CLAIM_START_DATE);
				}
			}
			this.AppModel.setProperty("/claimRequest/selectedDates", aDisabledDates);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/EclaimsItemDataDates", aDisabledDates);

			this.AppModel.setProperty("/cwsRequest/createCWSRequest/wbs", "");
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/wbsDesc", "");
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/wbsElementCode", "");
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/rateType", "");
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/selectedStartTime", "");
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/selectedEndTime", "");
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/hoursOrUnit", "");

			if (!this._oDateSelectPlanningCalendar) {
				this._oDateSelectPlanningCalendar = sap.ui.xmlfragment(this.createId("fragSelectPlanningCalendarDate"),
					"nus.edu.sg.opwrequest.view.fragments.detaillayout.SelectPlanningDateFromCalendar", this);
				this.getView().addDependent(this._oDateSelectPlanningCalendar);
				this._oDateSelectPlanningCalendar.setEscapeHandler(function () {
					return;
				});
				this._oDateSelectPlanningCalendar.open();
			}
		},

		onPressSelectDates: function (oEvent) {
			//Open a Dialog to show the Entire Data
			this.calendarSelectionDialog = sap.ui.xmlfragment("CalendarNTimeSelectionDialog",
				"nus.edu.sg.opwrequest.view.fragments.CalendarNTimeSelection", this);
			this.calendarSelectionDialog.addStyleClass("sapUiSizeCompact");
			this.getView().addDependent(this.calendarSelectionDialog);
			this.calendarSelectionDialog.open();
		},
		setMonthForCalendar: function () {
			var claimRequestModel = this.modelAssignment("ClaimRequest");
			var dateObj = new Date(claimRequestModel.getProperty("/month") + "-01");
			claimRequestModel.setProperty("/calendarDate", dateObj);
			this.getUIControl("dateSelectionCalendarId", "CalendarNTimeSelectionDialog").setDate(dateObj);
		},
		/**
		 * On Change Date Function at Detail Screen
		 */
		onChangeDuration: function (oEvent) {
			var ovalue = oEvent.getSource().getValue();
			if (isNaN(ovalue)) {
				oEvent.getSource().setValueStateText("Enter valid number");
				oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
				return;
			} else {
				oEvent.getSource().setValue(parseFloat(ovalue).toFixed(2));
			}

		},

		onChangeDatesNDuration: function (oEvent, key) {
			this.lastSuccessRun = new Date();
			if (key === "DR") {
				var oNumber = 0,
					oValue = oEvent.getSource().getValue();
				oNumber = oValue.replace(/\,/g, '');
				oNumber = Math.round(oNumber * 100) / 100;
				oNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
				oEvent.getSource().setValue(oNumber);

				this.AppModel.setProperty("/cwsRequest/createCWSRequest/DURATION_DAYS", oNumber);
			}
			// this.closeMessageStrip("cwsRequestDialogMStripId", "NewRequestTypeSelectionDialog");
			var validationMsg = Validation.validateDatesNDuration(this);
			// this.AppModel.setProperty("/cwsRequest/createCWSRequest/durationSplitList", []);
			var oBasicAmnt = this.AppModel.getProperty("/cwsRequest/createCWSRequest/AMOUNT");
			var data = this.AppModel.getProperty("/cwsRequest/createCWSRequest");

			var validateLeaving = Validation.validateLeavingDate(data, this);
			this.closeMessagePopOver();
			if (validationMsg) {
				var messageElement = {
					"type": "Error",
					"sTitle": "Duration Validation",
					"message": validationMsg
				};
				oEvent.getSource().setValue("");
				this.showMessagePopOver(messageElement);
			} else if (validateLeaving) {
				var messageElement = {
					"type": "Error",
					"sTitle": "Last Day Validation",
					"message": validateLeaving
				};
				oEvent.getSource().setValue("");
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/paymentList", []);
				this.showMessagePopOver(messageElement);
			} else {
				var oNumber = oEvent.getSource().getValue();
				if (key === "DR") {
					if (oNumber) {
						oNumber = oNumber.replace(/\,/g, '');
						oNumber = Math.round(oNumber * 100) / 100;
						oNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						oEvent.getSource().setValue(oNumber);
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/DURATION_DAYS", oNumber);
					} else {
						oEvent.getSource().setValue();
					}
				}
				this.populateDurationList();
				if (data.START_DATE && data.END_DATE) {
					this.populatePaymentYearList();
					this.populateUtilizationDays();
					if (oBasicAmnt) {
						// this.handleBasicAmount();
						this.populatePayment();
					}
				}
			}
			if (key === "DR" && !oEvent.getSource().getValue()) {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/DURATION_DAYS", "0.00");
			}
		},
		/**
		 * On Change Date - Start Date and End Date
		 */
		onChangeDate: function (oEvent) {
			this.lastSuccessRun = new Date();
			var startDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/START_DATE");
			var endDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/END_DATE");
			// this.closeMessageStrip("cwsRequestDialogMStripId", "CWSDurationDialog");
			if (startDate && endDate) {
				if (Formatter.compareDatesNValidate(startDate, endDate)) {
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/startDateDisplay", Formatter.formatDateAsString(startDate, "dd/MM/yyyy"));
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/endDateDisplay", Formatter.formatDateAsString(endDate, "dd/MM/yyyy"));
				} else {
					// this.showMessageStrip("cwsRequestDialogMStripId", "Please provide proper date range", "E", "CWSDurationDialog");
					if (oEvent)
						oEvent.getSource().setValue("");
				}
			}
		},
		onEnterDuration: function (oEvent) {
			this.lastSuccessRun = new Date();
			var srcVal = oEvent.getSource().getValue();
			// var requestModel = this.modelAssignment("CWSRequest");
			var startDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/START_DATE");
			var endDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/END_DATE");
			// this.closeMessageStrip("cwsRequestDialogMStripId", "CWSDurationDialog");
			var message = "";
			if (startDate && endDate && srcVal) {
				var diffDays = Formatter.getDaysDiff(startDate, endDate);
				message = (diffDays < Number(srcVal)) ?
					"Duration entered is greater than the date range.\n Please select valid range or provide correct duration" : "";
			} else {
				message = "Please select dates before providing the Duration";
			}
			if (message) {
				this.showMessageStrip("cwsRequestDialogMStripId", message, "E", "CWSDurationDialog");
				oEvent.getSource().setValue("");
				this.AppModel.setProperty("/duration", "");
			} else {
				this.populateDurationList(startDate, endDate, srcVal);
				this.populatePaymentYearList();
			}
		},

		handleBasicAmount: function () {
			var startDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/START_DATE");
			var endDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/END_DATE");
			var value = this.AppModel.getProperty("/cwsRequest/createCWSRequest/BASIC_AMOUNT");
			var sDate = new Date(startDate);
			var eDate = new Date(endDate);
			var paymentDetail;
			var oPaymentData = [];
			var diffInMonths = (eDate.getFullYear() - sDate.getFullYear()) * 12 + (eDate.getMonth() - sDate.getMonth());
			var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
			var currentMonth = sDate.getMonth();
			var currentYear = sDate.getFullYear();
			var durationPerMonth = Math.trunc((value) / (diffInMonths + 1));
			var calculatedPay = 0;
			for (var i = 0; i <= diffInMonths; i++) {
				paymentDetail = {};
				paymentDetail.PAYMENT_TYPE = "OW";
				paymentDetail.Month = monthNames[currentMonth] + ', ' + currentYear;
				paymentDetail.Status = "Not Paid";
				paymentDetail.Amount = (i === diffInMonths) ? (value - calculatedPay)
					.toFixed(2) : durationPerMonth.toFixed(2);
				calculatedPay += Number(paymentDetail.Amount);
				if (currentMonth === 11) {
					currentMonth = 0;
					currentYear++;
				} else {
					currentMonth++;
				}
				oPaymentData.push(paymentDetail);
			}
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/paymentDetailList", oPaymentData);

		},

		/**
		 * Populate Duration List
		 */
		populateDurationList: function (key) {
			var durationSplitList = [];
			var startDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/START_DATE");
			var endDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/END_DATE");
			var durationDays = this.AppModel.getProperty("/cwsRequest/createCWSRequest/DURATION_DAYS");

			this.AppModel.setProperty("/durationWarning", "");
			if (durationDays && parseFloat(durationDays) > parseFloat(this.getI18n("CwsRequest.DurationDeadline"))) {
				this.AppModel.setProperty("/durationWarning", this.getI18n("CwsRequest.DurationWarning"));
			}

			var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
				pattern: "yyyy-MM-dd"
			});
			var sDate = (startDate) ? oDateFormat.format(new Date(startDate)) : "";
			var eDate = (endDate) ? oDateFormat.format(new Date(endDate)) : "";

			if (sDate && eDate) {
				sDate = new Date(sDate);
				eDate = new Date(eDate);
				var year = sDate.getFullYear();
				var dividend = eDate.getFullYear() - sDate.getFullYear();
				var durationPerYear = Math.trunc((durationDays) / (dividend + 1)); //(duration / dividend);
				var durationElement;
				var splitDates = "";
				var calculatedDuration = 0;
				var db_durationElement;
				var db_durationSplitList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/durationSplitList");
				if (db_durationSplitList && db_durationSplitList.length > 0)
					db_durationSplitList.sort((a, b) => parseInt(a.YEAR) - parseInt(b.YEAR));

				durationSplitList = [];
				while (year <= eDate.getFullYear()) {
					durationElement = {};
					durationElement.YEAR = year + '';

					if (db_durationSplitList && db_durationSplitList.length > 0)
						db_durationElement = Utility._fndurationLoad(db_durationSplitList, durationElement.YEAR);

					if (db_durationElement && db_durationElement.DURATION) {
						durationElement.DURATION = db_durationElement.DURATION;
						durationElement.SPLIT_ID = db_durationElement.SPLIT_ID;
					} else {
						durationElement.DURATION = dividend === 0 ? durationDays : (year > sDate.getFullYear() && year === eDate.getFullYear()) ? (
							durationDays - calculatedDuration).toFixed(2) : durationPerYear.toFixed(2);
					}
					calculatedDuration += dividend === 0 ? Number(durationDays) : Number(durationElement.DURATION);
					splitDates = Formatter.splitDates(sDate, eDate, year);
					durationElement.START_DATE = splitDates.startDate;
					durationElement.END_DATE = splitDates.endDate;
					// durationElement.TOTAL_UTILIZATION_YR = durationElement.DURATION;
					durationSplitList.push(durationElement);
					year++;
				}
			}
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/durationSplitList", durationSplitList);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/DURATION_DAYS", durationDays);
		},
		/**
		 * Populate Payment Year List
		 */
		populatePaymentYearList: function () {
			var durationList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/durationSplitList");
			var paymentYearList = [];
			jQuery.sap.each(durationList, function (d, durationElement) {
				paymentYearList.push({
					"year": durationElement.YEAR
				})
			}.bind(this));

			paymentYearList.push({
				"year": "ALL"
			});

			this.AppModel.setProperty("/cwsRequest/createCWSRequest/paymentYearList", paymentYearList);
		},
		/**
		 * Populate  Total Utilization (by Year)
		 */
		populateUtilizationDays: function (oEvent) {
			if (oEvent) {
				var oInput = oEvent.getSource();
				var iValue = parseFloat(oInput.getValue());
				// update Duration days
				var oCont = this.AppModel.getProperty("/cwsRequest/createCWSRequest/durationSplitList");
				var sumofAbove = 0;
				var oPath = oEvent.getSource().getBindingContext("AppModel").getPath();
				var oIndex = Number(oPath.replace(/^\D+/g, ""));
				// var sYear = Number(this.AppModel.getProperty(oPath + "/YEAR"));
				// var endDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/END_DATE");
				var durationDays = this.AppModel.getProperty("/cwsRequest/createCWSRequest/DURATION_DAYS");

				for (var i = 0; i < oIndex; i++) {
					sumofAbove += Number(oCont[i].DURATION);
				}

				if (durationDays >= iValue) {
					if (oCont.length === 1) {
						var oInvalue = oCont[oIndex].DURATION;
						oInput.setValue(parseFloat(oInvalue).toFixed(2));
					} else {
						oCont[oIndex].DURATION = iValue.toFixed(2);
						var remainingDuration = durationDays - iValue; // Remaining duration after deducting the changed value
						var remainingCount = oCont.length - 1; // Number of remaining elements to distribute the duration
						var equalValue = Math.floor(remainingDuration / remainingCount); // Duration value to be equally distributed
						var remainder = remainingDuration % remainingCount; // Remainder to be added to the last index
						for (var p = 0; p < oCont.length; p++) {
							if (p !== oIndex) {
								oCont[p].DURATION = equalValue.toFixed(2);
							}
						}
						oCont[oCont.length - 1].DURATION = (parseFloat(oCont[oCont.length - 1].DURATION) + remainder).toFixed(2);
						oInput.setValue(iValue.toFixed(2));
					}
				} else {
					var aValidation = [];
					aValidation.push(Validation._formatMessageList("Error", "Duration Error", this.getI18n("CwsRequest.basicinfo.Duration")));
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", aValidation);
					this.onPressErrorMessages();
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/durationSplitList", this.ocwsRequest.durationSplitList);
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/DURATION_DAYS", this.ocwsRequest.DURATION_DAYS);
				}
			}

			this.fnUtilizeService();
		},

		fnUtilizeService: function (oEvent) {
			this.AppModel.setProperty("/durationState", "None");
			if (oEvent) {
				var value = 0,
					oInput = oEvent.getSource();
				if (oInput.getValue()) {
					value = oInput.getValue();
					value = value.replace(/\,/g, '');
					value = Math.round(value * 100) / 100;
					value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
					oInput.setValue(value);
				}
				this.AppModel.setProperty(oEvent.getSource().getBindingContext("AppModel").getPath() + "/DURATION", value);
			}

			var durationList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/durationSplitList");
			var utilizationList = [];
			jQuery.sap.each(durationList, function (d, durationElement) {
				utilizationList.push({
					"year": durationElement.YEAR,
					"days": durationElement.DURATION
				})
			}.bind(this));
			var oDeptRole = this.AppModel.getProperty("/isDeptOHRSS");
			var utilizationObj = {
				"staffId": this.AppModel.getProperty("/cwsRequest/createCWSRequest/STAFF_ID"),
				"draftId": this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID"),
				"requestId": this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_ID"),
				"aliasRole": (oDeptRole === true) ? "CW_OHRSS" : this.AppModel.getProperty("/userRole"),
				"processCode": this.getI18n("CwsRequest.ProcessCode.203"),
				"requestorGrp": this.AppModel.getProperty("/userRole"),
				"duration": utilizationList,
				"requestType": this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_TYPE"),
				"subType": this.AppModel.getProperty("/cwsRequest/createCWSRequest/SUB_TYPE")
			};

			if (this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_TYPE") || this.AppModel.getProperty(
				"/cwsRequest/createCWSRequest/SUB_TYPE")) {

				Services.getTotalUtilization(this, utilizationObj, function (utilisationData) {
					this._fnupdateDurationDays(utilisationData);
					// resolve();
				}.bind(this)
				);
				// var sUrl = Config.dbOperations.utilizationDays;
				// var oHeaders = Formatter._amendHeaderToken(this);
				// var utilizationModel = new JSONModel();
				// utilizationModel.loadData(sUrl, JSON.stringify(utilizationListHeader), null, "POST", null, null, oHeaders);
				// utilizationModel.attachRequestCompleted(function (oResponse) {
				// 	this._fnupdateDurationDays(oResponse.getSource().getData());
				// }.bind(this));
			}

		},

		_fnupdateDurationDays: function (odata) {
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/totalUtilization", odata);
			var durationDays = this.AppModel.getProperty("/cwsRequest/createCWSRequest/DURATION_DAYS");
			var durationList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/durationSplitList");
			if (odata.duration && durationList) {
				jQuery.sap.each(durationList, function (d, durationElement) {
					durationElement.TOTAL_UTILIZATION_YR = parseFloat(odata.duration[d].totalDays).toFixed(2);
				});
			}
			if (odata.isBreached) {
				this.AppModel.setProperty("/durationWarning", this.getI18n("CwsRequest.DurationWarning") + " " + odata.maximumDays + " " + this.getI18n(
					"CwsRequest.DurationWarning1"));
			} else {
				this.AppModel.setProperty("/durationWarning", "");
			}

		},

		monthDiff: function (d1, d2) {
			var months;
			months = ((d2.getFullYear() - d1.getFullYear()) * 12) + (d2.getMonth() - d1.getMonth()) + 1;
			return months;
		},

		populatePayment: function (oEvent) {
			var oValue;
			var oPaidAmount = this.AppModel.getProperty("/cwsRequest/createCWSRequest/PAID_AMOUNT");
			if (oEvent) {
				oValue = oEvent.getSource().getValue();
			} else {
				oValue = this.AppModel.getProperty("/cwsRequest/createCWSRequest/AMOUNT");
			}
			if (oValue) {
				oValue = oValue.toString();
				if (oValue.includes(",")) {
					oValue = oValue.replace(",", "");
				}

				if (oEvent && oPaidAmount) {
					if (Number(oValue) >= oPaidAmount) {
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", []);
					} else {
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/AMOUNT", "");
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/AMOUNT", this.ocwsRequest.AMOUNT);
						var aValidation = [];
						aValidation.push(Validation._formatMessageList("Error", "Payment Error", this.getI18n("CwsRequest.PaidAmount")));
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", aValidation);
						this.AppModel.setProperty("/oPaymentDatatable", true);
						this.onPressErrorMessages();
						return;
					}
				}
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/AMOUNT", parseFloat(oValue).toFixed(2));
				this.fnPaymentAmount();
			} else {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/AMOUNT", oValue);
			}
		},

		validateStartDate: function () {
			var oEData = [],
				oPaymentList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/paymentList");
			$.each(oPaymentList, function (id, obj) {
				if (obj.PAYMENT_REQ_STATUS === "54") {
					oEData.push(obj);
					this.AppModel.setProperty("/oStartdateEnabled", false);
				}
			}.bind(this));

			if (oEData && oEData.length > 0) {
				var YearMonth = oEData.reduce((acc, obj) => {
					var currYearMonth = parseInt(obj.YEAR + obj.MONTH, 10);
					var maxYearMonth = parseInt(obj.YEAR + obj.MONTH, 10);
					return currYearMonth > maxYearMonth ? obj : acc;
				});

				if (YearMonth) {
					var sDate = YearMonth.YEAR + "-" + YearMonth.MONTH + "-" + "01";
					var oDate = new Date(sDate);
					this.AppModel.setProperty("/oSetMinDate", oDate);
				}
			}
		},

		onChangeofUnit: function (oEvent) {
			this.lastSuccessRun = new Date();
			var unit = oEvent.getSource().getValue();
			var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var is_disc = this.AppModel.getProperty(sPath + "/IS_DISCREPENCY");
			if (is_disc) {
				var Amount = this.AppModel.getProperty(sPath + "/DISC_RATETYPE_AMOUNT");
			} else {
				Amount = this.AppModel.getProperty(sPath + "/RATE_TYPE_AMOUNT");
			}

			var totalAmount = unit * Amount;
			this.AppModel.setProperty(sPath + "/TOTAL_AMOUNT", totalAmount);
		},
		handleFileTypeMismatch: function (oEvent) {
			var uploadSet = this.getUIControl("UploadSet");
			uploadSet.removeItem();
		},
		/**
		 * Close Claim Type Dialog
		 */
		closeCalendarSelectionDialog: function () {
			if (this.calendarSelectionDialog) {
				this.calendarSelectionDialog.destroy(true);
			}
		},

		handleRemoveSelection: function () {
			this.getUIControl("dateSelectionCalendarId", "CalendarNTimeSelectionDialog").removeAllSelectedDates();
			this.modelAssignment("ClaimRequest").setProperty("/selectedClaimDates", []);
		},
		/**
		 * On Post Feed Comment
		 */
		onPostComment: function (oEvent) {
			this.lastSuccessRun = new Date();
			var aRemarksData = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REMARKS");
			// create new entry
			// var sValue = oEvent.getParameter("value");
			var sValue = this.AppModel.getProperty("/postRemarks");
			if (sValue) {
				sValue = sValue.trim();
				var sDate = Formatter.formatDateAsString(new Date(), "yyyy-MM-dd hh:MM:ss");
				var displayDate = Formatter.formatDateAsString(sDate, "dd/MM/yyyy hh:MM:ss");
				var oEntry = {
					"ID": "",
					"NUSNET_ID": this.AppModel.getProperty("/loggedInUserId"),
					"STAFF_ID": this.AppModel.getProperty("/loggedInUserStfNumber"),
					"STAFF_NAME": this.AppModel.getProperty("/staffInfo/FULL_NM"), //this.AppModel.getProperty("/loggedInUserInfo/displayName"),
					"REMARKS": sValue,
					"REMARKS_UPDATE_ON": sDate,
					"commentDisplayDate": displayDate,
					"STAFF_USER_TYPE": this.AppModel.getProperty("/cwsRequest/createCWSRequest/totalUtilization/aliasRole"),
					// "staffPhoto": this.AppModel.getProperty("/oImageRemark"),
					"oVisible": true
				};

				aRemarksData = (aRemarksData instanceof Array) ? aRemarksData : [];
				aRemarksData.unshift(oEntry);
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/REMARKS", aRemarksData);
				this.AppModel.setProperty("/postRemarks", "");
			} else {
				this.AppModel.setProperty("/postRemarks", "");
			}
		},

		validation: function () {
			this.validateDatesOverlap();
		},

		onPressEdit: function (key) {
			this.AppModel.setProperty("/oEditKey", key);
			this.ocwsRequest = $.extend(true, {}, this.AppModel.getProperty("/cwsRequest/createCWSRequest"));
			this.AppModel.setProperty("/showEditButton", false);
			this.AppModel.setProperty("/showUpdateButton", true);
			this.AppModel.setProperty("/showCancelButton", true);
			this.AppModel.setProperty("/showRejectButton", false);
			this.AppModel.setProperty("/showApproveButton", false);
			this.AppModel.setProperty("/isFormEditable", true);
			this.fnPaymentAmount();
			// Begin of change - CCEV3364
			this._editProgramManager();
			// End of change - CCEV3364
		},

		_editProgramManager: function () {
			var iFDLU = this.AppModel.getProperty("/cwsRequest/createCWSRequest/FDLU"),
				iULU = this.AppModel.getProperty("/cwsRequest/createCWSRequest/ULU"),
				oFDLUFilter = new Filter("FDLU", FilterOperator.EQ, iFDLU),
				oULUFilter = new Filter("ULU", FilterOperator.EQ, iULU),
				oULUAllFilter = new Filter("ULU", FilterOperator.EQ, "ALL"),
				oFdluAllFilter = new Filter("FDLU", FilterOperator.EQ, "ALL"),
				aAllFdluFilterGroup = new Filter({
					filters: [oULUFilter, oFDLUFilter],
					and: true
				}),
				aUluFdluFilterGroup = new Filter({
					filters: [oULUAllFilter, oFdluAllFilter],
					and: true
				}),
				aAllUluFilterGroup = new Filter({
					filters: [oULUFilter, oFdluAllFilter],
					and: true
				}),
				aFilterGroup = new Filter({
					filters: [aAllFdluFilterGroup, aUluFdluFilterGroup, aAllUluFilterGroup],
					and: false
				});
			this._bindItemProgramManager(aFilterGroup);
		},

		onPressCancel: function (oEvent) {
			this.lastSuccessRun = new Date();
			if (oEvent) {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest", this.ocwsRequest);
				this.AppModel.refresh(true);
			}
			this.ocwsRequest = "";
			if (this.AppModel.getProperty("/oEditKey") === "A") {
				this.AppModel.setProperty("/showEditButton", true);
				this.AppModel.setProperty("/showRejectButton", true);
				this.AppModel.setProperty("/showApproveButton", true);
			} else {
				this.AppModel.setProperty("/showEditButtonApproved", true);
				this.AppModel.setProperty("/showCloseButton", true);
				this.AppModel.setProperty("/showWithdrawButton", true);
			}

			if ((this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_STATUS") === "41" || this.AppModel.getProperty(
				"/cwsRequest/createCWSRequest/REQUEST_STATUS") === "45" || this.AppModel.getProperty(
					"/cwsRequest/createCWSRequest/REQUEST_STATUS") === "46" ||
				this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_STATUS") === "44")) {
				this.AppModel.setProperty("/showRejectButton", false);
				this.AppModel.setProperty("/showApproveButton", false);
			}

			this.AppModel.setProperty("/showUpdateButton", false);
			this.AppModel.setProperty("/showCancelButton", false);
			this.AppModel.setProperty("/isFormEditable", false);
		},

		onPressEditApproved: function (key) {
			this.lastSuccessRun = new Date();
			var sValid = true,
				oPayload = this.AppModel.getProperty("/oRequestHistory");
			if (oPayload.length > 1) {
				for (let i = 0; i < oPayload.length; i++) {
					var request = oPayload[i];
					// Check if the requestStatus contains the word "Pending"
					if (request.requestStatus.includes("Pending")) {
						sValid = false;
					}
				}
			}
			if (!sValid) {
				MessageBox.error("Change Request is already pending against " + this.AppModel.getProperty(
					"/cwsRequest/createCWSRequest/REQUEST_ID"));
			} else {
				this.AppModel.setProperty("/oEditKey", key);
				this.ocwsRequest = $.extend(true, {}, this.AppModel.getProperty("/cwsRequest/createCWSRequest"));
				this.AppModel.setProperty("/showEditButtonApproved", false);
				this.AppModel.setProperty("/isFormEditable", true);
				this.AppModel.setProperty("/showUpdateButton", true);
				this.AppModel.setProperty("/showCancelButton", true);
				this.AppModel.setProperty("/showCloseButton", false);
				this.AppModel.setProperty("/showWithdrawButton", false);
				this.fnPaymentAmount();
				this.validateStartDate();
				// Begin of change - CCEV3364
				this._editProgramManager();
				// End of change - CCEV3364
			}
		},

		onPressSave: function (oEvent) {
			var data = this.AppModel.getProperty("/cwsRequest/createCWSRequest");
			var validateLeaving = Validation.validateLeavingDate(data, this);
			if (validateLeaving) {
				var validationResponse = [];
				validationResponse.push(this._formatErrorList("Error", "Last Day Validation", validateLeaving));
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", validationResponse);
				this.onPressErrorMessages();
				return;
			}

			var validationResponse = Validation.validateCwsRequest(this);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", validationResponse.messageList);
			var errorList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages");
			var sKey = oEvent.getSource().getText();
			var oUpdate = sKey === 'Update' ? 'UPDATE' : 'RESUBMIT';
			if (oUpdate === "RESUBMIT" && this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_STATUS") !== "38") {
				oUpdate = "R_RESUBMIT";
			}
			var aSaveObj = this.getSaveObject(oUpdate);
			var oData = this.ocwsRequest;
			var skipFields = ["ACTION_CODE", "isReceivedPaymentUpdate", "isUpdateReqd", "ROLE", "SUBMISSION_TYPE", "WBS_Desc"];
			var isValid = this.compareJSONObjects(aSaveObj, oData, skipFields);
			if (isValid) {
				var aValidation = [];
				aValidation.push(Validation._formatMessageList("Error", "Error Detail", "Please make some changes to Re-Submit."));
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", aValidation);
				this.onPressErrorMessages();
			} else {
				aSaveObj.ACTION_CODE = sKey === 'Submit' ? 'SUBMIT' : oUpdate;
				if (errorList.length > 0) {
					this.onPressErrorMessages();
					return;
				}
				if (oUpdate === "RESUBMIT" || oUpdate === "R_RESUBMIT" || oUpdate === "SUBMIT") {
					this.confirmOnActionSubmit(this.getI18n("CwsRequest.Submit.Declaration"), "I", function () {
						this.showBusyIndicator();
						this.onPostComment();
						this.persistentOperationCalled(aSaveObj);
					}.bind(this));
				} else {
					this.onPostComment();
					this.persistentOperationCalled(aSaveObj);
				}
			}
		},

		compareJSONObjects: function (obj1, obj2, fieldsToSkip) {
			var str1 = JSON.stringify(obj1);
			var str2 = JSON.stringify(obj2);
			var parsedObj1 = JSON.parse(str1);
			var parsedObj2 = JSON.parse(str2);
			this.removeFields(parsedObj1, fieldsToSkip);
			this.removeFields(parsedObj2, fieldsToSkip);
			return JSON.stringify(parsedObj1) === JSON.stringify(parsedObj2);
		},

		removeFields: function (obj, fieldsToSkip) {
			if (!Array.isArray(fieldsToSkip)) {
				return;
			}
			fieldsToSkip.forEach(function (field) {
				delete obj[field];
			});
		},

		isEmpty: function (value) {
			return value === null || value === undefined || value === "";
		},

		onPressSaveDraftRequest: function (saveSource, sourceReq, unlockSent) {
			var saveOrSubmit = 'Save';
			var aSaveObj = this.getSaveObject(saveOrSubmit);
			if (aSaveObj.wbsList.length > 0) {
				aSaveObj.wbsList = aSaveObj.wbsList.filter(obj => !this.isEmpty(obj.WBS));
			}
			this.onPostComment();
			this.persistentOperationCalled(aSaveObj);
		},

		onPressCloseRequest: function () {
			var oUpdate = 'CLOSE';
			// this.AppModel.setProperty("/cwsRequest/createCWSRequest/SUBMISSION_TYPE", "");
			var validationElement = {};
			var validateResponse = {
				"messageList": []
			};
			var data = this.AppModel.getProperty("/cwsRequest/createCWSRequest");
			var validationResponse = Validation.validateNotPaid(data, validationElement, validateResponse.messageList,
				this);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", validationResponse);
			var errorList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages");
			if (errorList.length === 0) {
				this.confirmOnAction(this.getI18n("CwsRequest.Close"), "I", function () {
					this.showBusyIndicator();
					var aSaveObj = this.getSaveObject(oUpdate);
					this.onPostComment();
					this.persistentOperationCalled(aSaveObj);
				}.bind(this));
			} else {
				this.onPressErrorMessages();
			}
		},

		onPressRetract: function () {
			var oUpdate = 'RETRACT';
			// this.AppModel.setProperty("/cwsRequest/createCWSRequest/SUBMISSION_TYPE", "");
			this.confirmOnAction(this.getI18n("CwsRequest.Retract"), "I", function () {
				this.showBusyIndicator();
				var aSaveObj = this.getSaveObject(oUpdate);
				this.onPostComment();
				this.persistentOperationCalled(aSaveObj);
				// Begin of change - CCEV3364
				this._editProgramManager();
				// End of change - CCEV3364
			}.bind(this));
		},

		onPressWithdraw: function () {
			var data = this.AppModel.getProperty("/cwsRequest/createCWSRequest");

			var oUpdate = 'WITHDRAW';
			// this.AppModel.setProperty("/cwsRequest/createCWSRequest/SUBMISSION_TYPE", "D");
			var oRequestAmount = this.AppModel.getProperty("/cwsRequest/createCWSRequest/AMOUNT");
			var oPaidAmount = this.AppModel.getProperty("/cwsRequest/createCWSRequest/PAID_AMOUNT");

			var isDeptOhrss = this.AppModel.getProperty("/isDeptOHRSS");
			if ((oPaidAmount > 0) && !isDeptOhrss /*&& (oRequestAmount !== oPaidAmount)*/) {
				MessageBox.error(this.getI18n("CwsRequest.inValidAmount"));
				return;
			}

			this.confirmOnAction(this.getI18n("CwsRequest.Withdraw"), "I", function () {
				this.showBusyIndicator();
				var aSaveObj = this.getSaveObject(oUpdate);
				this.onPostComment();
				this.persistentOperationCalled(aSaveObj);
			}.bind(this));
		},

		onPressSubmit: function () {
			var oError = this.AppModel.getProperty("/cwsRequest/paymentError");
			var validationResponse = Validation.validateCwsRequest(this);
			if (oError && oError.length === 1) {
				validationResponse.messageList.push(oError[0]);
			}
			var oView = this.getView();
			var data = this.AppModel.getProperty("/cwsRequest/createCWSRequest/attachmentList");
			if (!data || data.results.length === 0) {
				this.AppModel.setProperty("/cwsRequest/validationRequest/cbDoctypeVState", ValueState.Error);
				this.AppModel.setProperty("/cwsRequest/validationRequest/cbDoctypeVStateText", this.getI18n("CwsRequest.AttachmnentType.Message"));
			} else {
				this.AppModel.setProperty("/cwsRequest/validationRequest/cbDoctypeVState", ValueState.None);
			}

			var data = this.AppModel.getProperty("/cwsRequest/createCWSRequest");
			var validateLeaving = Validation.validateLeavingDate(data, this);
			if (validateLeaving) {
				validationResponse.messageList.push(this._formatErrorList("Error", "Last Day Validation", validateLeaving));
			}
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", validationResponse.messageList);
			var errorList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages");
			if (errorList.length === 0) {
				this.confirmOnActionSubmit(this.getI18n("CwsRequest.Submit.Declaration"), "I", function () {
					this.showBusyIndicator();
					var aSaveObj = this.getSaveObject('Submit');
					this.onPostComment();
					this.persistentOperationCalled(aSaveObj);
				}.bind(this));
			} else {
				this.onPressErrorMessages();
			}
		},
		onPressApprove: function () {
			var CwsSrvModel = this.oOwnerComponent.getModel("CwsSrvModel");
			var filters = Utility._generateFilter("TASK_INST_ID", [this.taskId]);
			Services._readDataUsingOdataModel("/TaskDetailss", CwsSrvModel, this, filters, function (oData) {
				var oData = oData.results;
				if (oData.length > 0) {
					var oMsg = this._fnshowTaskError(oData[0]);
					if (oMsg && oMsg !== "view") {
						Utility._fnErrorDialog(this, oMsg, function () {
							Utility._fnCrossAppNavigationToInbox();
						}.bind(this));
					} else {
						this._fnApproveRequest();
					}
				}
			}.bind(this));
		},

		_fnApproveRequest: function () {
			var validationElement = {};
			var validateResponse = {
				"messageList": []
			};
			var validationResponse1 = {
				"messageList": []
			};

			var validationAttachment = [];

			var data = this.AppModel.getProperty("/cwsRequest/createCWSRequest");
			var validationResponse = Validation.validateCostDistributionPerc(data.wbsList, validationElement, validateResponse.messageList,
				this);
			var validationResponse1 = Validation.validateNegativePay(data.paymentList, validationElement, validationResponse1.messageList,
				this);
			var finalObj = validationResponse.concat(validationResponse1);

			var data = this.AppModel.getProperty("/cwsRequest/createCWSRequest/attachmentList");
			if (!data || data.results.length === 0) {
				var messageElement = {
					"type": "Error",
					"sTitle": "Error",
					"active": false,
					"message": "No attachment found, Kindly reject and resubmit the request."
				};

				validationAttachment.push(messageElement);
				if (finalObj.length === 0) {
					finalObj = validationAttachment;
				} else {
					finalObj = finalObj.concat(validationAttachment);
				}
			}

			this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", finalObj);
			var errorList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages");

			if (errorList.length === 0) {
				this.confirmOnAction("Do you want to Approve?", "I", function () {
					this.showBusyIndicator();
					var aSaveObj = this.getSaveObject('Approve');
					this.onPostComment();
					this.persistentOperationCalled(aSaveObj);
				}.bind(this));
			} else {
				this.onPressErrorMessages();
			}
		},

		onPressUpdateReceivables: function () {
			var data = this.AppModel.getProperty("/cwsRequest/createCWSRequest");
			if (data.receivedPaymentList.length > 0) {
				var validationResponse = Validation.validateUpdateReceivables(this);
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", validationResponse.messageList);
				var errorList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages");
				if (errorList.length === 0) {
					var aSaveObj = this.getSaveObject('Update Receivables');
					this.persistentOperationCalled(aSaveObj);
				} else {
					this.onPressErrorMessages();
				}
			} else {
				var aValidation = [];
				aValidation.push(Validation._formatMessageList("Error", "Updation Error", this.getI18n("CwsRequest.businesspayment.Message")));
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", aValidation);
				this.onPressErrorMessages();
				// MessageBox.error(this.getI18n("CwsRequest.businesspayment.Message"));
			}
		},

		onAcknowledgedCancel: function () {
			this.aSaveObj = [];
			Utility._handleCloseOpenedFragment(this);
			this.hideBusyIndicator();
		},
		persistentOperationCalled: function (cwsRequest) {
			cwsRequest = Formatter.parseObjectData(cwsRequest);
			delete (cwsRequest.Photo);
			//Handle for Save and Submission
			Services.persistCwsRequest(this, cwsRequest, function (response) {
				this.handleAfterPosting(response);
			}.bind(this));
		},
		handleAfterPosting: function (postResponse) {
			this.lastSuccessRun = new Date();
			if (this.autoSaveTrigger) {
				this.autoSaveTrigger.setInterval(0);
			}
			var cwsResponse = (postResponse && postResponse.cwResponse instanceof Array) ? postResponse.cwResponse[0] : postResponse;
			var statusCode = cwsResponse.statusCode;
			// var oActionCode = this.AppModel.getProperty("/cwsRequest/createCWSRequest/ACTION_CODE");
			var oPayLoad = this.AppModel.getProperty("/cwsRequest/createCWSRequest");
			this.AppModel.setProperty("/isNavigate", false);
			if (cwsResponse.statusCode === "S") {
				//Handle Success Returns 

				this.AppModel.setProperty("/cwsRequest/createCWSRequest/REMARKS", cwsResponse.REMARKS);
				if (cwsResponse.ACTION_CODE === "SAVE") {
					this.runAutoSave = true;
					Utility._rebindAllUISections(this, cwsResponse);
					// this.onStaffphotoLoad();
					this.populateUtilizationDays();
					if (cwsResponse.wbsList.length > 0) {
						this._fnWbsDesc();
					} else {
						this.onAddWbsElement();
					}
				}

				if (cwsResponse.ACTION_CODE === "UPDATE") {
					Utility._rebindAllUISections(this, cwsResponse);
					this.populateUtilizationDays();
					this._fnWbsDesc();
					this.onPressCancel();
				}

				if (cwsResponse.ACTION_CODE === "UPDATE RECEIVABLES") {
					Utility._rebindAllUISections(this, cwsResponse);
					MessageToast.show("Data has been updated successfully.");
				}

				if (cwsResponse.ACTION_CODE === "SAVE") {
					MessageToast.show("Draft saved");
					// localStorage.setItem("New_DraftID", cwsResponse.REQ_UNIQUE_ID);
					this.AppModel.setProperty("/oCopyMode", "");
					this.AppModel.setProperty("/showSubmitButton", true);
					this.AppModel.setProperty("/showDeleteButton", true);
					if (this.AppModel.getProperty("/oSourceCall") === 'onCloseSaveCall') {
						this.runAutoSave = false;
						this.AppModel.setProperty("/cwsRequest/createCWSRequest", {});
						this.oRouter.navTo("master", {
							layout: "OneColumn"
						}, true);
					}
				}
				if (cwsResponse.ACTION_CODE === "UPDATE") {
					MessageToast.show("Data has been updated successfully.");
				} else if (statusCode === "S") {
					if (cwsResponse.TASK_INST_ID) {
						this.unLockstop = false;
						Utility._fnSuccessDialog(this, cwsResponse.message, function () {
							Utility._fnCrossAppNavigationToInbox();
						}.bind(this));

					} else if (cwsResponse.ACTION_CODE === "SUBMIT" || cwsResponse.ACTION_CODE === "RESUBMIT" || cwsResponse.ACTION_CODE ===
						"R_RESUBMIT") {
						this.AppModel.setProperty("/cwsRequest/createCWSRequest", {});
						this.runAutoSave = false;
						if (cwsResponse.ACTION_CODE === "RESUBMIT" || cwsResponse.ACTION_CODE === "R_RESUBMIT") {
							this.onPressCancel();
						}
						Utility._fnSuccessDialog(this, "Request ID".concat(" ", cwsResponse.REQUEST_ID, " submitted successfully."), function () {
							this.oRouter.navTo("master", {
								layout: "OneColumn"
							}, true);
						}.bind(this), cwsResponse.DISPLAY_PM_WARN_MSG); //Added cwsResponse.DISPLAY_PM_WARN_MSG
					} else if (cwsResponse.ACTION_CODE === "WITHDRAW") {
						this.AppModel.setProperty("/cwsRequest/createCWSRequest", {});
						this.runAutoSave = false;
						Utility._fnSuccessDialog(this, cwsResponse.message, function () {
							this._fnClearLocal();
							this.oRouter.navTo("master", {
								layout: "OneColumn"
							}, true);
						}.bind(this));
					} else if (cwsResponse.ACTION_CODE === "RETRACT") {
						Utility._fnSuccessDialog(this, cwsResponse.message, function () {
							// localStorage.setItem("New_DraftID", cwsResponse.REQ_UNIQUE_ID);
							this._project = "cwsRequestViews('" + cwsResponse.REQ_UNIQUE_ID + "')";
							this._fnGetOpwnRequestData();
						}.bind(this));
					} else if (cwsResponse.ACTION_CODE === "CLOSE") {
						this.AppModel.setProperty("/cwsRequest/createCWSRequest", {});
						this.runAutoSave = false;
						Utility._fnSuccessDialog(this, cwsResponse.message, function () {
							this.oRouter.navTo("master", {
								layout: "OneColumn"
							}, true);
						}.bind(this));
					}
				} else if (statusCode === "E") {
					var sValidation = [];
					sValidation.push(this._formatErrorList("Error", "Error Detail", cwsResponse.message));
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", sValidation);
					this.onPressErrorMessages();
				} else {
					var sValidation = [];
					sValidation.push(this._formatErrorList("Error", "Error Detail", cwsResponse.message));
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", sValidation);
					this.onPressErrorMessages();
				}
			} else { //Handle Error Messages
				this.runAutoSave = false;
				if (statusCode === "W") {
					this.confirmOnAction(cwsResponse.message, "W", function () {
						this.showBusyIndicator();
						// var aSaveObj = this.getSaveObject(oActionCode);
						oPayLoad.isDuplicateCheck = true;
						this.onPostComment();
						this.persistentOperationCalled(oPayLoad);
					}.bind(this));
				} else if (cwsResponse.ERROR_STATE) {
					var sValidation = [];
					sValidation.push(this._formatErrorList("Error", "Error Detail", cwsResponse.validationResults));
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", sValidation);
					this.onPressErrorMessages();
				} else if (cwsResponse.message && cwsResponse.error) {
					var sValidation = [];
					sValidation.push(this._formatErrorList("Error", "Error Detail", cwsResponse.message));
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", sValidation);
					this.onPressErrorMessages();
				} else {
					var oMsg = cwsResponse.message ? cwsResponse.message : "Error Occurred while saving the request.";
					var sValidation = [];
					sValidation.push(this._formatErrorList("Error", "Error Detail", oMsg));
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", sValidation);
					this.onPressErrorMessages();
				}
			}
			if (this.AppModel.getProperty("/userRole") === 'CW_ESS') {
				Utility._handleCloseOpenedFragment(this);
			}
			this.hideBusyIndicator();
		},

		remarksDataRefresh: function (EclaimSrvModel, draftId) {
			var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
			oCatalogSrvModel.read(Config.dbOperations.remarksData, {
				filters: [new Filter("REFERENCE_ID", FilterOperator.EQ, draftId)],
				success: function (oData) {
					if (oData) {
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/REMARKS", oData.results);
					}
				}.bind(this),
				error: function (oError) { }
			});
		},
		onAcknowledgedSubmit: function () {
			this.showBusyIndicator(); //added to avoid multiple clicking of Submit button in confirmation pop-up
			this.onSubmitBackendCall();

		},

		onPressReject: function () {
			var CwsSrvModel = this.oOwnerComponent.getModel("CwsSrvModel");
			var filters = Utility._generateFilter("TASK_INST_ID", [this.taskId]);
			Services._readDataUsingOdataModel("/TaskDetailss", CwsSrvModel, this, filters, function (oData) {
				var oData = oData.results;
				if (oData.length > 0) {
					var oMsg = this._fnshowTaskError(oData[0]);
					if (oMsg && oMsg !== "view") {
						Utility._fnErrorDialog(this, oMsg, function () {
							Utility._fnCrossAppNavigationToInbox();
						}.bind(this));
					} else {
						this._fnRejectRequest();
					}
				}
			}.bind(this));
		},
		_fnRejectRequest: function () {
			if (!this._oRejectDialog) {
				this._oRejectDialog = sap.ui.xmlfragment(
					"RejectReasonDialog",
					"nus.edu.sg.opwrequest.view.fragments.detaillayout.RejectRemarks",
					this
				);
				this.getView().addDependent(this._oRejectDialog);
			}
			this._oRejectDialog.open();
			this.AppModel.setProperty("/oRejectState", "None");
			this.closeMessageStrip("rejectionRemarksDialogId", "RejectReasonDialog");
		},
		onCancelRejectReason: function () {
			this.AppModel.setProperty("/oRejectState", "None");
			var sRejectRemarks = Utility._fnAppModelSetProperty(this, "/rejectionRemarks", "");
			this._oRejectDialog.close();
			this._oRejectDialog.destroy();
			this._oRejectDialog = null;
			this._oRejectDialog = undefined;
		},
		onChangeRejRemarks: function (oEvent) {
			var txt = oEvent.getSource().getValue();
			if (txt.length > 0) {
				this.AppModel.setProperty("/oRejectState", "None");
			}
		},
		onSubmitRejectReason: function () {
			this.showBusyIndicator();
			this.closeMessageStrip("rejectionRemarksDialogId", "RejectReasonDialog");
			var serviceUrl = Config.dbOperations.postClaim;
			var sRejectRemarks = Utility._fnAppModelGetProperty(this, "/rejectionRemarks");
			if (sRejectRemarks.trim().length > 0) {
				var aSaveObj = this.getSaveObject('Reject');
				var aRemarksData = aSaveObj.REMARKS;
				// create new entry
				var sValue = sRejectRemarks.trim();
				var sDate = Formatter.formatDateAsString(new Date(), "yyyy-MM-dd hh:MM:ss");
				var displayDate = Formatter.formatDateAsString(sDate, "dd/MM/yyyy hh:MM:ss");
				var oEntry = {
					"ID": "",
					"NUSNET_ID": this.AppModel.getProperty("/loggedInUserId"),
					"STAFF_ID": this.AppModel.getProperty("/loggedInUserStfNumber"),
					"STAFF_NAME": this.AppModel.getProperty("/staffInfo/FULL_NM"),
					"REMARKS": sValue,
					"REMARKS_UPDATE_ON": sDate,
					"commentDisplayDate": displayDate,
					"STAFF_USER_TYPE": this.AppModel.getProperty("/cwsRequest/createCWSRequest/totalUtilization/aliasRole")
				};

				aRemarksData = (aRemarksData instanceof Array) ? aRemarksData : [];
				aRemarksData.unshift(oEntry);
				aSaveObj.REMARKS = aRemarksData;
				this.persistentOperationCalled(aSaveObj);
			} else {
				// this.showMessageStrip("rejectionRemarksDialogId", this.getI18n("RejectionRemarksRequired"), "E", "RejectReasonDialog");
				// MessageBox.error(this.getI18n("RejectionRemarksRequired"));
				this.AppModel.setProperty("/oRejectState", "Error");
				this.hideBusyIndicator();
			}
		},

		getSaveObject: function (saveOrSubmit) {
			var userRole = this.AppModel.getProperty("/userRole");

			$.each(this.AppModel.getProperty("/cwsRequest/createCWSRequest/REMARKS"), function (idx, obj) {
				// delete obj.staffPhoto;
				delete obj.oVisible;
			}.bind(this));

			// if (this.AppModel.getProperty("/oWBSDeletion").length > 0) {
			// 	var owbList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/wbsList");
			// 	owbList = owbList.concat(this.AppModel.getProperty("/oWBSDeletion"));
			// 	this.AppModel.setProperty("/cwsRequest/createCWSRequest/wbsList", owbList);
			// }

			if (this.AppModel.getProperty("/cwsRequest/createCWSRequest/wbsList").length > 0) {
				$.each(this.AppModel.getProperty("/cwsRequest/createCWSRequest/wbsList"), function (idx, obj) {
					delete obj.WBS_Desc;
					delete obj.valueStateTextWbs;
					delete obj.valueStateWbs;
				}.bind(this));
			}

			var saveObject = this.AppModel.getProperty("/cwsRequest/createCWSRequest");

			var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
				pattern: "yyyy-MM-dd"
			});
			var sDate = (saveObject.START_DATE) ? oDateFormat.format(new Date(saveObject.START_DATE)) : "";
			var eDate = (saveObject.END_DATE) ? oDateFormat.format(new Date(saveObject.END_DATE)) : "";
			saveObject.START_DATE_STR = sDate;
			saveObject.END_DATE_STR = eDate;
			if (saveObject.START_DATE) {
				saveObject.START_DATE = new Date(Date.UTC(
					saveObject.START_DATE.getFullYear(),
					saveObject.START_DATE.getMonth(),
					saveObject.START_DATE.getDate(),
					saveObject.START_DATE.getHours(),
					saveObject.START_DATE.getMinutes(),
					saveObject.START_DATE.getSeconds()
				));
			}
			if (saveObject.END_DATE) {
				saveObject.END_DATE = new Date(Date.UTC(
					saveObject.END_DATE.getFullYear(),
					saveObject.END_DATE.getMonth(),
					saveObject.END_DATE.getDate(),
					saveObject.END_DATE.getHours(),
					saveObject.END_DATE.getMinutes(),
					saveObject.END_DATE.getSeconds()
				));
			}
			if (saveOrSubmit.toUpperCase() === 'SAVE' || saveOrSubmit.toUpperCase() === 'SUBMIT' || saveOrSubmit.toUpperCase() === 'RESUBMIT') {
				// check for populating Requestor Group for 201 and 202
				saveObject.REQUESTOR_GRP = userRole;
				if (!saveObject.STAFF_ID) {
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/STAFF_ID", this.AppModel.getProperty("/loggedInUserStfNumber"));
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/STAFF_NUSNET_ID", this.AppModel.getProperty("/loggedInUserId"));
				}
			}
			if (saveOrSubmit.toUpperCase() === 'SUBMIT') {
				saveObject.REQUEST_STATUS = "40";
			} else if (saveOrSubmit.toUpperCase() === 'SAVE' && !saveObject.REQUEST_STATUS) {
				saveObject.REQUEST_STATUS = "31";
			}

			delete saveObject.paymentDetailList;
			// // Begin of change - CCEV3364
			saveObject.paymentList = saveObject.paymentList;
			// // End of change - CCEV3364
			// saveObject.ROLE = this.AppModel.getProperty("/userRole");
			saveObject.ROLE = (this.taskName) ? this.taskName : saveObject.REQUESTOR_GRP;
			saveObject.REMARKS = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REMARKS");
			saveObject.ACTION_CODE = (saveOrSubmit) ? saveOrSubmit.toUpperCase() : 'SAVE';
			//Begin of change - CCEV3364
			saveObject.SELECTED_PROGRAM_MGR = this.AppModel.getProperty("/cwsRequest/createCWSRequest/SELECTED_PROGRAM_MGR");
			saveObject.APPROVED_BY = this.AppModel.getProperty("/APPROVED_BY");
			// End of change - CCEV3364
			saveObject.TASK_INST_ID = this.taskId;
			saveObject.isUpdateReqd = (saveOrSubmit.toUpperCase() === 'UPDATE') ? true : false;
			saveObject.isReceivedPaymentUpdate = saveOrSubmit === "Update Receivables" ? true : false;
			saveObject.isDuplicateCheck = (saveObject.SUBMISSION_TYPE === "U") ? true : false;
			return saveObject;
		},
		onCancelSelectDatesForPlanningClaim: function () {

			if (this.AppModel.getProperty("/cwsRequest/createCWSRequest/selectAllDatesApplied")) {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/selectAllDates", true);
			} else {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/selectAllDates", false);
			}
			this._oDateSelectPlanningCalendar.close();
			this._oDateSelectPlanningCalendar.destroy();
			this._oDateSelectPlanningCalendar = undefined;
			this._oDateSelectPlanningCalendar = null;
		},

		onPressSelectAll: function (oEvent) {

			var oCalendar = this.getUIControl("fragSelectPlanningCalendarDate--dateSelectionCalendarId");
			if (oEvent.getSource().getSelected()) {
				oEvent.getSource().setText("Unselect All");
				var dateToAddForSelection = new sap.ui.unified.DateRange();
				var startDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/minDateMonth");
				var endDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/maxDateMonth");
				dateToAddForSelection.setProperty("startDate", startDate);
				oCalendar.removeAllSelectedDates();
				oCalendar.addSelectedDate(dateToAddForSelection);
				var noOfDays = endDate.getDate();
				var i;
				for (i = 0; i < noOfDays - 1; i++) {
					var newDateToAddForSelection = new sap.ui.unified.DateRange();
					var newDate = new Date(startDate);
					var nextDate = newDate.getDate() + (i + 1);
					newDate.setDate(nextDate);
					newDateToAddForSelection.setProperty("startDate", newDate);
					oCalendar.addSelectedDate(newDateToAddForSelection);
				}
				// this.AppModel.setProperty("/cwsRequest/createCWSRequest/selectAllDates", true);
			} else {
				oCalendar.removeAllSelectedDates();
				oEvent.getSource().setText("Select All");
			}

		},

		_fnAddToken: function (oControl, sKey, sText) {
			oControl.setTokens([new sap.m.Token({
				text: sText,
				key: sKey
			})]);
		},
		onPressIconComment: function (oEvent) {

			var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var obj = this.AppModel.getProperty(sPath);
			this.AppModel.setProperty("/itemCommentSelectedPath", sPath);
			var oButton = oEvent.getSource(),
				oView = this.getView();

			if (!this._oCommentPopover) {
				this._oCommentPopover = sap.ui.xmlfragment(oView.getId(),
					"nus.edu.sg.claimrequest.view.fragments.detaillayout.ClaimDatesComment", this);
				oView.addDependent(this._oCommentPopover);
			}
			sap.ui.core.Fragment.byId(oView.getId(), "commentShow").setValue(
				obj.REMARKS);
			this._oCommentPopover.openBy(oButton);
		},
		onSaveCommentItem: function () {
			var sPath = this.AppModel.getProperty("/itemCommentSelectedPath");
			var sRemarks = this.getView().byId("commentShow").getValue();
			this.AppModel.setProperty(sPath + "/REMARKS", sRemarks);
			this.AppModel.setProperty("/itemCommentSelectedPath", null);
			this.onCancelCommentItem();
		},
		onCancelCommentItem: function () {
			this.getView().byId("myPopoverForComment").close();
		},
		handleCancelPress1: function () {
			this._pDialog1.close();
		},

		handleCancelPress2: function () {
			this._pDialog2.close();
		},
		onPressOptions: function (oEvent) {
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/sPath", '');
			var sPath = oEvent.getSource().getParent().getBindingContext("AppModel").sPath;
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/sPath", sPath);
			var oButton = oEvent.getSource();
			this.byId("claimActionSheet").openBy(oButton);
		},
		onPressAddAssistance: function (oEvent) {
			this.lastSuccessRun = new Date();
			var asstList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/assistanceList");
			asstList = (asstList && asstList instanceof Array) ? asstList : [];
			asstList.push({
				"STAFF_NAME": "",
				"STAFF_ULU": "",
				"STAFF_FDLU": "",
				"isFdluEnabled": false
			});
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/assistanceList", asstList);
			this.AppModel.refresh(true);
		},
		onPressDeleteAssistance: function (oEvent) {
			this.lastSuccessRun = new Date();
			var sContextPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var sRemoveRecordIndex = sContextPath.split("/cwsRequest/createCWSRequest/assistanceList/")[1];
			var asstList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/assistanceList");
			asstList.splice(sRemoveRecordIndex, 1);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/assistanceList", asstList);
			this.AppModel.refresh(true);
		},
		onPressAddReceivedPayment: function (oEvent) {
			this.lastSuccessRun = new Date();
			var receivedPayList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/receivedPaymentList");
			var startDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/START_DATE");
			if (startDate) {
				receivedPayList = (receivedPayList && receivedPayList instanceof Array) ? receivedPayList : [];
				receivedPayList.push({
					"YEAR": startDate.getFullYear() + '',
					"REMUNERATION_TYPE": this.getI18n("CwsRequest.Rmn.Monetary"),
					"STOCK_OPTION_QNTY": "",
					"AMOUNT": "",
					"CURRENCY": this.getI18n("CwsRequest.Currency"),
					"BIZ_EXP_CRNCY": this.getI18n("CwsRequest.Currency"),
					"STOCK_QNTY": "",
					"SHARES": "",
					"DESCRIPTION": "",
					"IS_WAIVED": "N",
					"PAYMENT_REF_NO": "",
					"PAYMENT_DATE": null,
					"PAYMENT_TYPE": "R"
				});
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/receivedPaymentList", receivedPayList);
				this.AppModel.refresh(true);
			}
		},
		onPressDeleteReceivedPayment: function (oEvent) {
			this.lastSuccessRun = new Date();
			var receivedPayList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/receivedPaymentList");
			var sRemoveRecordIndex = (receivedPayList.length) ? (receivedPayList.length - 1) : 0;
			receivedPayList.splice(sRemoveRecordIndex, 1);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/receivedPaymentList", receivedPayList);
			this.AppModel.refresh(true);
		},
		onPressAddPayment: function (oEvent) {
			this.lastSuccessRun = new Date();
			var payList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/paymentList");
			var startDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/START_DATE");
			if (startDate) {
				payList = (payList && payList instanceof Array) ? payList : [];
				payList.push({
					"YEAR": startDate.getFullYear() + '',
					"REMUNERATION_TYPE": this.getI18n("CwsRequest.Rmn.Monetary"),
					"STOCK_OPTION_QNTY": "",
					"AMOUNT": "",
					"CURRENCY": this.getI18n("CwsRequest.Currency"),
					"BIZ_EXP_CRNCY": this.getI18n("CwsRequest.Currency"),
					"STOCK_QNTY": "",
					"SHARES": "",
					"DESCRIPTION": "",
					"IS_WAIVED": "N",
					"isReceivable": false,
					"PAYMENT_TYPE": "A"
				});
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/paymentList", payList);
				this.AppModel.refresh(true);
			}
		},
		onPressDeletePayment: function (oEvent) {
			this.lastSuccessRun = new Date();
			var payList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/paymentList");
			var sRemoveRecordIndex = (payList.length) ? (payList.length - 1) : 0;
			payList.splice(sRemoveRecordIndex, 1);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/paymentList", payList);
			this.AppModel.refresh(true);
		},

		onAddWbsElement: function (key) {
			// this.lastSuccessRun = new Date();
			var payData = this.AppModel.getProperty("/cwsRequest/createCWSRequest/wbsList");
			payData = (payData && payData instanceof Array) ? payData : [];
			var oValue = 100,
				divide = key !== "RE" ? payData.length + 1 : payData.length;
			if (key !== "RE") {
				payData.push({
					"WBS": "",
					"VALUE": oValue,
					"UNIT": "Percentage",
					"IS_DELETED": "N"
				});
			}

			if (payData.length > 0) {
				var iEqualValue = Math.floor(oValue / divide);
				var remainder = oValue % divide;
				for (var i = 0; i < payData.length; i++) {
					payData[i].VALUE = (i === payData.length - 1) ? (iEqualValue + remainder) : iEqualValue;
				}
			}
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/wbsList", payData);
			this.AppModel.refresh(true);
		},

		onPressDeleteWbsEntry: function (oEvent) {
			this.lastSuccessRun = new Date();
			var payData = this.AppModel.getProperty("/cwsRequest/createCWSRequest/wbsList");
			var sRemoveRecordIndex = (payData.length) ? (payData.length - 1) : 0;
			payData[sRemoveRecordIndex].IS_DELETED = "Y";
			if (payData[sRemoveRecordIndex].WBS !== "") {
				this.AppModel.getProperty("/oWBSDeletion").push(payData[sRemoveRecordIndex]);
			}
			payData.splice(sRemoveRecordIndex, 1);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/wbsList", payData);
			this.onAddWbsElement("RE");
		},
		// Begin of change - CCEV3364
		onProgramManagerChange: function (oEvent) {
			var oSelectedItem = oEvent.getSource().getSelectedItem();
			if (!oSelectedItem) {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/SELECTED_PROGRAM_MGR", []);
				return;
			} else if (oSelectedItem.getBindingContext("AppModel").getObject().STAFF_ID === "Default") {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/SELECTED_PROGRAM_MGR", []);
				return;
			}
			var oProgramManagerBindingObject = oSelectedItem.getBindingContext("AppModel").getObject(),
				oProgramManagerItem = {
					"STAFF_FULL_NAME": oProgramManagerBindingObject.FULL_NM,
					"STAFF_ID": oProgramManagerBindingObject.STAFF_ID,
					"ULU": oProgramManagerBindingObject.ULU,
					"FDLU": oProgramManagerBindingObject.FDLU,
					"NUSNET_ID": oProgramManagerBindingObject.STAFF_NUSNET_ID,
					"PPNT_ID": ""
				},
				aProgramManagers = [];
			var aExistingProgramManagers = this.AppModel.getProperty("/cwsRequest/Program_Manager");
			if (aExistingProgramManagers) {
				if (aExistingProgramManagers.length > 0) {
					oProgramManagerItem.PPNT_ID = this.AppModel.getProperty("/cwsRequest/Program_Manager")[0].PPNT_ID;
				}
			}
			aProgramManagers.push(oProgramManagerItem);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/SELECTED_PROGRAM_MGR", aProgramManagers);
		},
		// End of change - CCEV3364
		onChangeRemunerationType: function (oEvent) {
			this.lastSuccessRun = new Date();
			var sPath = oEvent.oSource.getBindingContext("AppModel").sPath;
			this.AppModel.setProperty(sPath + "/STOCK_OPTION_QNTY", "");
			this.AppModel.setProperty(sPath + "/AMOUNT", "");
			this.AppModel.setProperty(sPath + "/CURRENCY", "");
			this.AppModel.setProperty(sPath + "/STOCK_QNTY", "");
			this.AppModel.setProperty(sPath + "/DESCRIPTION", "");
			this.AppModel.setProperty(sPath + "/SHARES", "");
		},
		onChangePropertyUsage: function (oEvent) {
			this.changeVState(oEvent);
			this.lastSuccessRun = new Date();
			var selectedKey = (oEvent && oEvent instanceof Object) ? oEvent.getSource().getProperty("selectedKey") : oEvent;
			var levyList = this.AppModel.getProperty("/levyList");
			var percentValue = "";

			jQuery.sap.each(levyList, function (l, levy) {
				if (levy.CONFIG_KEY === selectedKey) {
					percentValue = parseFloat(levy.REFERENCE_VALUE);
				}
			});
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/LEVY_PERCENT", percentValue);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/waiverVisible", Boolean(percentValue));
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/IS_WAIVED", Boolean(percentValue) ? "N" : "");
		},
		onEditToggleButtonPress: function () {
			var oObjectPage = this.getView().byId("ObjectPageLayout"),
				bCurrentShowFooterState = oObjectPage.getShowFooter();

			oObjectPage.setShowFooter(!bCurrentShowFooterState);
		},

		handleFullScreen: function () {
			this.runAutoSave = false;
			this.oRouter.navTo("detail", {
				layout: "MidColumnFullScreen",
				project: this._project
			});
		},

		handleExitFullScreen: function () {
			this.runAutoSave = false;
			this.oRouter.navTo("detail", {
				layout: "TwoColumnsBeginExpanded",
				project: this._project
			});
		},

		handleClose: function () {
			var isLocked = this.AppModel.getProperty("/isClaimLocked");
			var isSaveButtonEnabled = this.AppModel.getProperty("/showSaveButton");
			if (isLocked === false && isSaveButtonEnabled === true) {
				//Confirm user to save before closing
				this.confirmPopUpToSaveBeforeClose();
			} else {
				this.onClose();
			}

		},

		confirmPopUpToSaveBeforeClose: function () {
			var that = this;
			this._fnClearLocal();
			this.AppModel.setProperty("/onCloseViewIsSave", '');
			MessageBox.confirm("Do you want to save before exiting?", {
				title: "Confirmation",
				actions: [sap.m.MessageBox.Action.YES,
				sap.m.MessageBox.Action.NO
				],
				emphasizedAction: sap.m.MessageBox.Action.OK,
				onClose: function (oAction) {
					if (oAction === "YES") {
						var saveSource = 'onCloseSaveCall';
						that.AppModel.setProperty("/oSourceCall", 'onCloseSaveCall');
						that.onPressSaveDraftRequest(saveSource, null, true);
						that.AppModel.setProperty("/onCloseViewIsSave", 'Y');
						// that.onClose();
					} else {
						that.onClose();
						that.AppModel.setProperty("/onCloseViewIsSave", 'N');
					}
				}
			});
		},

		onClose: function () {
			this._fnClearLocal();
			if (this.viaInbox) {
				Utility._fnCrossAppNavigationToInbox();
			} else if (this.viaClaimReport) {
				Utility._fnCrossAppNavigationToReport();
			} else if (this.viaClaimofn) {
				Utility._fnCrossAppNavigationToofn();
			} else {
				var AppModel = this.AppModel.getProperty("/");
				RequestLockHelper._handleLocking(this, this.getI18n("ClaimDetail.UnLock"), AppModel.cwsRequest.createCWSRequest.REQ_UNIQUE_ID,
					Utility._fnHandleStaffId(this),
					function (oResponse) {

					}.bind(this));
				this.runAutoSave = false; //stop auto save	
				this.AppModel.setProperty("/cwsRequest/createCWSRequest", {});
				var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/closeColumn");
				this.oRouter.navTo("master", {
					layout: sNextLayout
				}, true);
			}
		},

		onExit: function () {
			this.runAutoSave = false; //stop auto save
			if ((this.viaRequestorForm || this.viaInbox) && !this.firstTimeUnlockRequest && this.unLockstop) {
				this._fnRequestLockHandling();
			}
		},
		_fnRequestLockHandling: function () {
			if (this.AppModel) {
				var AppModel = this.AppModel.getProperty("/");
				RequestLockHelper._handleLocking(this, this.getI18n("ClaimDetail.UnLock"), AppModel.cwsRequest.createCWSRequest.REQ_UNIQUE_ID,
					Utility._fnHandleStaffId(this),
					function (oData) {
						this.oRouter.getRoute("master").detachPatternMatched(this._onProductMatched, this);
						this.oRouter.getRoute("detail").detachPatternMatched(this._onProductMatched, this);
					}.bind(this));
			}
		},

		onPressValidateClaim: function (oEvent) {
			this.showBusyIndicator();
			//this.aSaveObj = this.getSaveObject(saveOrSubmit);
			var oReturnValidation = validation._fnSubmitValidation(this);
			if (oReturnValidation.hasValidationError) {
				MessageBox.error("Validation failed. Please check Error List for details");
				this.hideBusyIndicator();
				return;
			} else {
				this.handleValidation();
			}
		},
		handleValidation: function () {
			var saveOrSubmit = 'Submit';
			this.aSaveObj = this.getSaveObject(saveOrSubmit);
			Utility._fnValidateClaim(this, function (oData) {
				if (!oData.getParameter("success")) {
					MessageBox.error(JSON.parse(oData.getParameter("errorobject").responseText).message);
				} else if (oData.getParameter("success")) {
					var oResponse = oData.getSource().getProperty("/");
					if (oResponse.error) {
						if (oResponse.claimDataResponse.eclaimsData[0].ERROR_STATE) {
							this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", oResponse.claimDataResponse.eclaimsData[
								0].validationResults);
							MessageBox.error(oResponse.message);
						}
					} else {
						MessageToast.show(this.getI18n("ValidationSuccessfulMessage"));
					}
				}
				this.hideBusyIndicator();
			}.bind(this));
		},

		onPressErrorMessages: function (oEvent) {
			var oView = this.getView();
			if (!this._pMessagePopover) {
				this._pMessagePopover = sap.ui.xmlfragment("CwsMessagePopOver",
					"nus.edu.sg.opwrequest.view.fragments.detaillayout.SingleRequestErrorMessagesPopover", this);
				oView.addDependent(this._pMessagePopover);
			}
			var oSourceControl = oEvent ? oEvent.getSource() : this.getUIControl("cwsErrorMessagesId");
			// this._pMessagePopover.openBy(oSourceControl);
			setTimeout(function () {
				this._pMessagePopover.openBy(oSourceControl);
			}.bind(this), 100);

		},
		handleDeleteAttachment: function (oEvent) {
			this.lastSuccessRun = new Date();
			try {
				this.showBusyIndicator();
				var oList = oEvent.getSource(),
					oItem = oEvent.getParameter("listItem"),
					sPath = oItem.getBindingContext("AppModel").getPath();
				var oAttachment = this.AppModel.getProperty(sPath);
				//fetch rate Type and rate Amount 
				var draftId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID");
				var oProcessCode = this.AppModel.getProperty("/cwsRequest/createCWSRequest/PROCESS_CODE");

				var oParameter = {
					draftId: draftId,
					attachmentId: oAttachment.ATTCHMNT_ID,
					processCode: oProcessCode
				};

				var oHeaders = Formatter._amendHeaderToken(this);
				var serviceUrl = Config.dbOperations.deleteAttachment;
				Services._loadDataAttachment(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
					if (oData.getSource().getData().status === "S") {
						this._fnRefreshAttachment();
						this.hideBusyIndicator();
					} else {
						MessageBox.error(his.getI18n("AttachmentFailedToDelete"));
					}

				}.bind(this));
			} catch (oError) {
				this.hideBusyIndicator();
			}

		},
		handleDownloadPress: function (oEvent) {
			this.lastSuccessRun = new Date();
			try {
				// this.showBusyIndicator();
				var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
				var oAttachment = this.AppModel.getProperty(sPath);
				//fetch rate Type and rate Amount 
				var draftId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID");
				var oProcessCode = this.AppModel.getProperty("/cwsRequest/createCWSRequest/PROCESS_CODE");
				var role = this.AppModel.getProperty("/userRole");

				var oParameter = {
					draftId: draftId,
					attachmentId: oAttachment.ATTCHMNT_ID,
					role: role,
					processCode: oProcessCode
				};

				var oHeaders = Formatter._amendHeaderToken(this);
				var serviceUrl = Config.dbOperations.fetchAttachment;
				Services._loadDataAttachment(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
					if (oData.getSource().getData().status === "S") {
						this._fnDownloadFile(oData.getSource().getData().attachmentFiles);
						this.hideBusyIndicator();
					} else {
						MessageBox.error(this.getI18n("AttachmentFailedToDownload"));
					}

				}.bind(this));
			} catch (oError) {
				this.hideBusyIndicator();
			}

		},
		_fnDownloadFile: function (aFiles) {
			if (aFiles.length > 0) {
				var anchDownlaod = document.createElement("a");
				anchDownlaod.href = "data:" + aFiles[0].contentType + ";base64," + aFiles[0].docContent;
				anchDownlaod.download = aFiles[0].docName;
				// anchDownlaod.target = "_blank";
				// window.open(anchDownlaod.href, '_blank');
				anchDownlaod.click();
			} else {
				return MessageBox.error("No files available for download.");
			}

		},
		openAttachment: function (oEvent) {
			this.lastSuccessRun = new Date();
			try {
				// this.showBusyIndicator();
				var sPath = oEvent.getSource().getBindingContext("AppModel").getPath();
				var oAttachment = this.AppModel.getProperty(sPath);
				//fetch rate Type and rate Amount 
				var draftId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID");
				var role = this.AppModel.getProperty("/userRole");
				var oProcessCode = this.AppModel.getProperty("/cwsRequest/createCWSRequest/PROCESS_CODE");

				var oParameter = {
					draftId: draftId,
					attachmentId: oAttachment.ATTCHMNT_ID,
					role: role,
					processCode: oProcessCode
				};

				var oHeaders = Formatter._amendHeaderToken(this);
				var serviceUrl = Config.dbOperations.fetchAttachment;
				Services._loadDataAttachment(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
					if (oData.getSource().getData().status === "S") {
						this._fnOpenFile(oData.getSource().getData().attachmentFiles);
						this.hideBusyIndicator();
					} else {
						MessageBox.error(his.getI18n("AttachmentFailedToDownload"));
					}

				}.bind(this));
			} catch (oError) {
				this.hideBusyIndicator();
			}
		},
		_fnOpenFile: function (aFiles) {
			if (aFiles.length > 0) {
				// var anchDownlaod = document.createElement("a");
				var href = "data:" + aFiles[0].contentType + ";base64," + aFiles[0].docContent;
				const byteCharacters = atob(aFiles[0].docContent);
				const byteArrays = [];

				for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
					const slice = byteCharacters.slice(offset, offset + 1024);

					const byteNumbers = new Array(slice.length);
					for (let i = 0; i < slice.length; i++) {
						byteNumbers[i] = slice.charCodeAt(i);
					}

					const byteArray = new Uint8Array(byteNumbers);

					byteArrays.push(byteArray);
				}
				const blob = new Blob(byteArrays, {
					type: aFiles[0].contentType
				});
				const blobUrl = URL.createObjectURL(blob);

				window.open(blobUrl, '_blank');
				// anchDownlaod.click();
			} else {
				return MessageBox.error("No files available for download.");
			}
		},

		onStaffphotoLoad: function () {
			try {
				var oCont = Services.fetchUserImageAsync(this, this.AppModel.getProperty("/loggedInUserStfNumber"));
				this.AppModel.setProperty("/oImageRemark", "data:image/png;base64," + oCont[0].photo);
				if (this.AppModel.getProperty("/cwsRequest/createCWSRequest/REMARKS") && this.AppModel.getProperty(
					"/cwsRequest/createCWSRequest/REMARKS").length > 0) {
					$.each(this.AppModel.getProperty("/cwsRequest/createCWSRequest/REMARKS"), function (idx, obj) {
						if (!obj.staffPhoto) {
							var oCont = Services.fetchUserImageAsync(this, obj.STAFF_ID);
							obj.staffPhoto = "data:image/png;base64," + oCont[0].photo;
						}
					}.bind(this));
				}
			} catch (oError) {

			}
			if (this.AppModel.getProperty("/cwsRequest/createCWSRequest/REMARKS") && this.AppModel.getProperty(
				"/cwsRequest/createCWSRequest/REMARKS").length > 0) {
				var oDate = this.AppModel.getProperty("/cwsRequest/createCWSRequest/MODIFIED_ON");
				var oStatus = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_STATUS")
				$.each(this.AppModel.getProperty("/cwsRequest/createCWSRequest/REMARKS"), function (idx, obj) {

					if ((new Date(obj.REMARKS_UPDATE_ON) > new Date(oDate)) || (oStatus === "31" || oStatus === "44" || oStatus === "45" ||
						oStatus === "46")) {
						obj.oVisible = true;
					} else {
						obj.oVisible = false;
					}
				}.bind(this));
			}
		},

		_fnWbsDesc: function () {
			var oData = this.AppModel.getProperty("/cwsRequest/createCWSRequest/wbsList");
			var oWBSData = oData.filter(val => val.IS_DELETED !== "Y");
			// var token = this.AppModel.getProperty("/token");
			const saveObj = {
				WBSRequest: {
					WBS: []
				}
			};
			// oWBSData.forEach(obj => saveObj.WBSRequest.WBS.push(obj.WBS));

			// var uniqueWBSList = Array.from(new Set(oWBSData.map(item => item.WBS))).map(wbs => {
			// 	return oWBSData.find(item => item.WBS === wbs);
			// });

			const seen = new Set();
			const uniqueWBSList = oWBSData.reduce((acc, obj) =>
				seen.has(obj.WBS) ? acc : (seen.add(obj.WBS), acc.push(obj), acc), []);

			saveObj.WBSRequest.WBS = uniqueWBSList.map(i => i.WBS);

			Services.validateWbs(this, saveObj, function (wbsDataResp) {

				if (wbsDataResp.EtOutput && wbsDataResp.EtOutput.item) {
					if (wbsDataResp.EtOutput.item.EvStatus === 'E') {
						var oMsg = wbsDataResp.EtOutput.item.EvMsg;
					} else {
						var oWBS = [],
							oCont = wbsDataResp.EtOutput.item;
						if (!Array.isArray(oCont)) {
							oWBS.push(oCont);
						} else {
							oWBS = oCont;
						}
						jQuery.sap.each(uniqueWBSList, function (i, obj) {
							try {
								if (obj.WBS === oWBS[i].EvActwbs || obj.WBS === oWBS[i].EvWbs) {
									obj.WBS = (oWBS[i].EvActwbs) ? oWBS[i].EvActwbs : oWBS[i].EvWbs;
									obj.WBS_Desc = oWBS[i].EvWbsdesc;
								}
							} catch (e) { }
						});
					}
				} else {
					jQuery.sap.each(uniqueWBSList, function (i, obj) {
						obj.WBS_Desc = "WBS Description not found";
					});
				}
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/wbsList", []);
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/wbsList", uniqueWBSList);
				// resolve();
			}.bind(this)
			);
			// var url = Config.dbOperations.checkWbs;
			// var wbsValidateModel = new JSONModel();
			// wbsValidateModel.loadData(url, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
			// var oWBSData = wbsValidateModel.getData();

			// if (oWBSData.EtOutput && oWBSData.EtOutput.item) {
			// 	if (wbsValidateModel.getData().EtOutput.item.EvStatus === 'E') {
			// 		var oMsg = wbsValidateModel.getData().EtOutput.item.EvMsg;
			// 	} else {
			// 		var oWBS = [],
			// 			oCont = wbsValidateModel.getData().EtOutput.item;
			// 		if (!Array.isArray(oCont)) {
			// 			oWBS.push(oCont);
			// 		} else {
			// 			oWBS = oCont;
			// 		}
			// 		jQuery.sap.each(uniqueWBSList, function (i, obj) {
			// 			try {
			// 				if (obj.WBS === oWBS[i].EvActwbs || obj.WBS === oWBS[i].EvWbs) {
			// 					obj.WBS = (oWBS[i].EvActwbs) ? oWBS[i].EvActwbs : oWBS[i].EvWbs;
			// 					obj.WBS_Desc = oWBS[i].EvWbsdesc;
			// 				}
			// 			} catch (e) { }
			// 		});
			// 	}
			// } else {
			// 	jQuery.sap.each(uniqueWBSList, function (i, obj) {
			// 		obj.WBS_Desc = "WBS Description not found";
			// 	});
			// }
			// this.AppModel.setProperty("/cwsRequest/createCWSRequest/wbsList", []);
			// this.AppModel.setProperty("/cwsRequest/createCWSRequest/wbsList", uniqueWBSList);
		},

		onChangeWBS: function (oEvent) {
			this.lastSuccessRun = new Date();
			var sPath = oEvent.oSource.getBindingContext("AppModel").sPath;
			var oIndex = Number(sPath.replace(/^\D+/g, ""));
			var sWBS = this.AppModel.getProperty(sPath + "/WBS");
			var oWBSData = this.AppModel.getProperty("/cwsRequest/createCWSRequest/wbsList");
			var oWBSkey = false;
			sWBS = (sWBS) ? sWBS.trim() : "";
			if (sWBS) {
				if (oWBSData) {
					jQuery.sap.each(oWBSData, function (i, obj) {
						if (obj.WBS === sWBS && i !== oIndex) {
							oWBSkey = true;
						}
					});
				}

				// var token = this.AppModel.getProperty("/token");
				var saveObj = {};
				saveObj.WBSRequest = {};
				saveObj.WBSRequest.WBS = [];
				saveObj.WBSRequest.WBS.push(sWBS);
				// var oHeaders = {
				// 	"Accept": "application/json",
				// 	"Authorization": "Bearer" + " " + token,
				// 	"AccessPoint": "A",
				// 	"Content-Type": "application/json"
				// };
				this.AppModel.setProperty(sPath + "/valueStateWbs", "None");
				this.AppModel.setProperty(sPath + "/valueStateTextWbs", "");

				Services.validateWbs(this, saveObj, function (oWBSData) {
					if (!oWBSData.EtOutput || (oWBSData.EtOutput && oWBSData.EtOutput.item &&
						oWBSData.EtOutput.item.EvStatus === 'E') || oWBSkey) {
						var keymsg = !oWBSData.EtOutput ? "Invalid WBS: " + sWBS : wbsValidateModel.getData().EtOutput.item.EvMsg;
						var modifiedMessage = keymsg.replace(/\bexists\b/g, "exist");
						var oMsg = oWBSkey ? "Entry already exist" : modifiedMessage;
						this.AppModel.setProperty(sPath + "/WBS", "");
						this.AppModel.setProperty(sPath + "/WBS_CODE", "");
						this.AppModel.setProperty(sPath + "/WBS_Desc", "");
						this.AppModel.setProperty(sPath + "/valueStateWbs", "Error");
						this.AppModel.setProperty(sPath + "/valueStateTextWbs", oMsg);
					} else {
						if (oWBSData.EtOutput && oWBSData.EtOutput.item) {
							this.AppModel.setProperty(sPath + "/WBS", oWBSData.EtOutput.item.EvActwbs);
							this.AppModel.setProperty(sPath + "/WBS_CODE", Utility.getFormattedWBS(oWBSData.EtOutput.item.EvActwbs));
							this.AppModel.setProperty(sPath + "/WBS_Desc", oWBSData.EtOutput.item.EvWbsdesc);
						}
					}
					resolve();
				}.bind(this)
				);


				// var url = "/rest/eclaims/ecpwbsvalidate";
				// var wbsValidateModel = new JSONModel();
				// wbsValidateModel.loadData(url, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
				// var oWBSData = wbsValidateModel.getData();
				// this.AppModel.setProperty(sPath + "/valueStateWbs", "None");
				// this.AppModel.setProperty(sPath + "/valueStateTextWbs", "");
				// if (!oWBSData.EtOutput || (oWBSData.EtOutput && oWBSData.EtOutput.item &&
				// 	oWBSData.EtOutput.item.EvStatus === 'E') || oWBSkey) {
				// 	var keymsg = !oWBSData.EtOutput ? "Invalid WBS: " + sWBS : wbsValidateModel.getData().EtOutput.item.EvMsg;
				// 	var modifiedMessage = keymsg.replace(/\bexists\b/g, "exist");
				// 	var oMsg = oWBSkey ? "Entry already exist" : modifiedMessage;
				// 	this.AppModel.setProperty(sPath + "/WBS", "");
				// 	this.AppModel.setProperty(sPath + "/WBS_CODE", "");
				// 	this.AppModel.setProperty(sPath + "/WBS_Desc", "");
				// 	this.AppModel.setProperty(sPath + "/valueStateWbs", "Error");
				// 	this.AppModel.setProperty(sPath + "/valueStateTextWbs", oMsg);
				// } else {
				// 	if (oWBSData.EtOutput && oWBSData.EtOutput.item) {
				// 		this.AppModel.setProperty(sPath + "/WBS", oWBSData.EtOutput.item.EvActwbs);
				// 		this.AppModel.setProperty(sPath + "/WBS_CODE", Utility.getFormattedWBS(oWBSData.EtOutput.item.EvActwbs));
				// 		this.AppModel.setProperty(sPath + "/WBS_Desc", oWBSData.EtOutput.item.EvWbsdesc);
				// 	}
				// }

			} else {
				this.AppModel.setProperty(sPath + "/WBS_Desc", "");
			}
		},

		onClear: function (key) {
			if (key === "Info") {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/BASIC_AMOUNT", "");
			}
			if (key === "Client") {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/FACULTY_T", "");
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/DEPT_T", "");
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/CLIENT_NAME", "");
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/LOCATION", "");
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/PROGRAM_NAME", "");
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/WORK_DETAILS", "");
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/PROPERTY_USAGE", "");
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/PROPERTY_DETAILS", "");
			}
			if (key === "Payment") {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/BASIC_AMOUNT", "");
			}
			this.AppModel.refresh(true);
		},

		onChangepercentage: function (oEvent) {
			this.lastSuccessRun = new Date();
			var oInput = oEvent.getSource();
			var iValue = parseFloat(oInput.getValue());
			var oIndex = oEvent.getSource().getId().slice(-1);
			oIndex = Number(oIndex);
			var iTotal = 0;
			var oData = this.AppModel.getProperty("/cwsRequest/createCWSRequest/wbsList");

			$.each(oData, function (idx, obj) {
				iTotal += obj.VALUE;
			});

			if (oData.length === 1) {
				oInput.setValue(parseFloat(oInput.getValue()));
			} else {
				var iRemaining = 100 - parseFloat(oInput.getValue());
				var iEqualValue = Math.floor(iRemaining / (oData.length - 1));
				var remainder = iRemaining % (oData.length - 1);

				$.each(oData, function (idx, obj) {
					if (oIndex === idx) {
						obj.VALUE = parseFloat(oInput.getValue());
					} else {
						obj.VALUE = (idx === oData.length - 1) ? (remainder + iEqualValue) : iEqualValue;
					}
				});
			}
		},

		onPressRequestHistory: function (oEvent) {
			this.lastSuccessRun = new Date();
			var oView = this.getView();
			var oRqstid = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_ID"),
				oUniqueid = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID");
			var sUrl = Config.dbOperations.requestDetails;
			if (oRqstid && oUniqueid) {
				sUrl = sUrl + "?requestUniqueId=" + oUniqueid + "&requestId=" + oRqstid;
				var oHeaders = Formatter._amendHeaderToken(this);
				var oRqstmodel = new JSONModel();
				oRqstmodel.loadData(sUrl, null, null, "GET", null, null, oHeaders);
				oRqstmodel.attachRequestCompleted(function (oResponse) {
					if (oResponse.getSource().getData().length > 1) {
						this.AppModel.setProperty("/oRequestHistory", oResponse.getSource().getData());
						this.AppModel.setProperty("/showHistoryButton", true);
						this._fnRefreshAttachment();
						this.fnHandlechangeRequest();
					} else {
						this.AppModel.setProperty("/oRequestHistory", []);
						this.AppModel.setProperty("/showHistoryButton", false);
					}
				}.bind(this));
			}
			if (oEvent) {
				var oButton = oEvent.getSource();
				if (!this._pPopover) {
					this._pPopover = Fragment.load({
						id: oView.getId(),
						name: "nus.edu.sg.opwrequest.view.fragments.HistoryPopup",
						controller: this
					}).then(function (oPopover) {
						oView.addDependent(oPopover);
						return oPopover;
					}.bind(this));
				}
				this._pPopover.then(function (oPopover) {
					oPopover.openBy(oButton);
				});
			}
		},

		handleCloseButton: function (oEvent) {
			this.byId("myPopover").close();
		},

		onPressDeleteRemark: function (oEvent) {
			this.lastSuccessRun = new Date();
			var CwsSrvModel = this.oOwnerComponent.getModel("CwsSrvModel");
			var oPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var idx = Number(oPath.replace(/^\D+/g, ""));
			var remarksId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REMARKS")[idx].ID;
			if (remarksId) {
				Services._loadDataUsingJsonModel(this, Config.dbOperations.deleteRemarks + "('" + remarksId + "')", null, "DELETE", function (
					oData) {
					this._fnRemoveRemarks(idx);
				}.bind(this));
			} else {
				this._fnRemoveRemarks(idx);
			}
		},

		_fnRemoveRemarks: function (idx) {
			var remarksList = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REMARKS");
			remarksList.splice(idx, 1);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/REMARKS", remarksList);
		},

		onPressEditRemark: function (oEvent) {
			this.lastSuccessRun = new Date();
			var oPath = oEvent.getSource().getBindingContext("AppModel").getPath();
			var oIndex = Number(oPath.replace(/^\D+/g, ""));
			var oRemarks = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REMARKS");

			if (!this.oRejectDialog) {
				this.oRejectDialog = new sap.m.Dialog({
					title: "Edit Remarks",
					type: sap.m.DialogType.Message,
					content: [
						new sap.m.TextArea("rejectionNote", {
							width: "100%",
							placeholder: "Enter Remarks",
							liveChange: function (oEvent) {
								var sText = oEvent.getParameter("value");
								this.oRejectDialog.getBeginButton().setEnabled(sText.length > 0);
							}.bind(this)
						})
					],
					beginButton: new sap.m.Button({
						type: sap.m.ButtonType.Emphasized,
						text: "Save",
						press: function () {
							var sText = sap.ui.getCore().byId("rejectionNote").getValue();
							this.AppModel.getProperty("/cwsRequest/createCWSRequest/REMARKS")[oIndex].REMARKS = sText;
							this.AppModel.refresh(true);
							sap.ui.getCore().byId("rejectionNote").setValue();
							this.oRejectDialog.close();
						}.bind(this)
					}),
					endButton: new sap.m.Button({
						text: "Cancel",
						press: function () {
							sap.ui.getCore().byId("rejectionNote").setValue();
							this.oRejectDialog.close();
						}.bind(this)
					})
				});
				sap.ui.getCore().byId("rejectionNote").setValue(oRemarks[oIndex].REMARKS);
			} else {
				this.oRejectDialog.getBeginButton().setEnabled(true);
				sap.ui.getCore().byId("rejectionNote").setValue(oRemarks[oIndex].REMARKS);
			}
			this.oRejectDialog.open();
		},

		_formatErrorList: function (type, sColumnName, message) {
			var messageObj = {};
			messageObj.type = type;
			messageObj.sTitle = sColumnName;
			messageObj.title = sColumnName;
			messageObj.state = type;
			messageObj.message = message;

			return messageObj;
		}
	});
});