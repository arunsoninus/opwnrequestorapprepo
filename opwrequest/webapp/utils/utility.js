sap.ui.define([
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/ui/core/Fragment",
	"sap/ui/model/Sorter",
	"sap/ui/model/json/JSONModel",
	"./services",
	"./appconstant",
	"./configuration",
	"sap/m/Dialog",
	"sap/m/Text",
	"sap/m/FlexBox"
], function (Filter, FilterOperator, FilterType, Fragment, Sorter, JSONModel, Services, AppConstant, Config, Dialog, Text, FlexBox) {
	"use strict";
	var utility = ("nus.edu.sg.opwrequest.utils.utility", {
		_fnAppModelGetProperty: function (component, sPath) {
			return component.AppModel.getProperty(sPath) ? component.AppModel.getProperty(sPath) : "";
		},
		_fnAppModelSetProperty: function (component, sPath, sValue) {
			return component.AppModel.setProperty(sPath, sValue);
		},
		_fnFilterCreation: function (component) {
			component._mFilters = {
				"Draft": [new Filter("REQUEST_STATUS", FilterOperator.EQ, '31')],
				"RejReq": [],
				"Process": [],
				"Post": [],
				"All": []
			};
			var aRejectedList = component.AppModel.getProperty("/statusConfigDetails");
			if (aRejectedList instanceof Array) {
				aRejectedList.forEach(function (oValue) {
					if (oValue.STATUS_ALIAS.indexOf("Reject") !== -1) {
						component._mFilters.RejReq.push(new Filter(
							"REQUEST_STATUS", FilterOperator.EQ, oValue.STATUS_CODE));
					}

					if (oValue.STATUS_ALIAS.indexOf("Pending") !== -1 || oValue.STATUS_ALIAS.indexOf("Completed") !== -1 || oValue.STATUS_ALIAS.indexOf(
						"Transferred") !== -1 || oValue.STATUS_ALIAS.indexOf("In Progress") !== -1 || oValue.STATUS_ALIAS.indexOf("Cancelled") !== -1 ||
						oValue.STATUS_ALIAS.indexOf("Suspended") !== -1 || oValue.STATUS_ALIAS.indexOf("Completed") !== -1 || oValue.STATUS_ALIAS.indexOf(
							"Completed") !== -1) {
						component._mFilters.Process.push(new Filter(
							"REQUEST_STATUS", FilterOperator.EQ, oValue.STATUS_CODE));
					}
					if (oValue.STATUS_ALIAS.indexOf("Posted") !== -1) {
						component._mFilters.Post.push(new Filter(
							"REQUEST_STATUS", FilterOperator.EQ, oValue.STATUS_CODE));
					}

				});

			}
		},
		_assignTokenAndUserInfo: function (oRetData, component) {
			// component.AppModel.setProperty("/token", oRetData.token);
			if (oRetData && oRetData.staffInfo) {
				component.AppModel.setProperty("/loggedInUserStfNumber", oRetData.staffInfo.primaryAssignment.STF_NUMBER);
				component.AppModel.setProperty("/loggedInUserSfStfNumber", oRetData.staffInfo.primaryAssignment.SF_STF_NUMBER);
				component.AppModel.setProperty("/loggedInUserId", oRetData.staffInfo.primaryAssignment.NUSNET_ID);
				//to incorporate primary and secondary assignments(concurrent case ULU and FDLUs)	
				component.AppModel.setProperty("/primaryAssigment", oRetData.staffInfo.primaryAssignment);
				component.AppModel.setProperty("/otherAssignments", oRetData.staffInfo.otherAssignment);
				component.AppModel.setProperty("/appMatrixAuth", (oRetData.staffInfo.approverMatrix) ? oRetData.staffInfo.approverMatrix : []);
				component.AppModel.setProperty("/staffInfo", oRetData.staffInfo);
				var sListUluFdluQuickView = oRetData.staffInfo.primaryAssignment.ULU_T.concat("(", oRetData.staffInfo.primaryAssignment.ULU_C).concat(
					")\n ", oRetData.staffInfo.primaryAssignment.FDLU_T).concat("(", oRetData.staffInfo.primaryAssignment.FDLU_C).concat(")", "");

				//Concurrent Appointment assigned to the Staff
				for (var t = 0; t < oRetData.staffInfo.otherAssignment.length; t++) {
					var oOtherAssign = oRetData.staffInfo.otherAssignment[t];
					sListUluFdluQuickView = sListUluFdluQuickView.concat("\n\n", oOtherAssign.ULU_T).concat("(", oOtherAssign.ULU_C).concat(") / ",
						oOtherAssign.FDLU_T).concat("(", oOtherAssign.FDLU_C).concat(")", "");
				}
				component.AppModel.setProperty("/sClaimaintListUluFdlu", sListUluFdluQuickView);

				var oDashboardParameterModel = sap.ui.getCore().getModel("DashboardParameterModel");
				if (!oDashboardParameterModel) {
					// this._fnNavToDashboard(component);
				} else {
					var sRole = oDashboardParameterModel.getProperty("/role");
					var sKey = oDashboardParameterModel.getProperty("/key");
					if (oDashboardParameterModel.getProperty("/info")) {
						component.AppModel.setProperty("/oParameterNew", oDashboardParameterModel.getProperty("/info"));
						oDashboardParameterModel.setProperty("/info", "");
					}

					if (sRole === "CLMNT") {
						component.AppModel.setProperty("/userRole", "ESS");
					} else if (sRole === "CMASST") {
						component.AppModel.setProperty("/userRole", "CA");
					} else {
						if (!sRole && !component.viaClaimReport && !component.viaClaimofn) {
							this._fnNavToDashboard(component);
						}
					}

					var oComponentData = component.getOwnerComponent().getComponentData();

					if (sKey) {
						component.AppModel.setProperty("/iconTabBarSelectedKey", sKey);
					}
				}
				var isDeptAdmin = false,
					isAppAdmin = false;
				if (oRetData && oRetData.staffInfo && oRetData.staffInfo.inboxApproverMatrix) {
					jQuery.sap.each(oRetData.staffInfo.inboxApproverMatrix, function (i, appElement) {
						if (appElement.STAFF_USER_GRP === component.getI18n("CwsRequest.User.DeptAdminAlias")) {
							isDeptAdmin = true;
						} else if (appElement.STAFF_USER_GRP === component.getI18n("CwsRequest.User.AppAdminAlias") && appElement.STAFF_USER_GRP ===
							component.getI18n("CwsRequest.ProcessCode.203")) {
							isAppAdmin = true;
						}
					});
				}
				component.AppModel.setProperty("/isAppAdmin", isAppAdmin);
				var isOHRSS = false,
					isPRGM_ADMIN = false;
				component.AppModel.setProperty("/isDeptOHRSS", false);
				if (oRetData && oRetData.staffInfo && oRetData.staffInfo.inboxApproverMatrix) {
					for (var i = 0; i < oRetData.staffInfo.inboxApproverMatrix.length; i++) {
						var object = oRetData.staffInfo.inboxApproverMatrix[i];
						if (object.STAFF_USER_GRP === component.getI18n("CwsRequest.OHRSS") && object.PROCESS_CODE === component.getI18n(
							"CwsRequest.ProcessCode.203")) {
							isOHRSS = true;
						}
					}
				}
				if (isOHRSS) {
					component.AppModel.setProperty("/isDeptOHRSS", true);
				}

				component.AppModel.setProperty("/isDepartmentAdmin", isDeptAdmin);
				component.AppModel.setProperty("/userRole", (component.viaInbox === true) ? component.taskName : (isDeptAdmin) ? component.getI18n(
					"CwsRequest.User.DeptAdminAlias") : component.getI18n("CwsRequest.User.StaffAlias"));

			}
		},

		_fnNavToDashboard: function (component) {
			// var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"); // get a handle on the global XAppNav service
			// var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
			// 	target: {
			// 		semanticObject: "cwsnedrequestscreen",
			// 		action: "display"
			// 	},
			// 	params: {}
			// })) || ""; // generate the Hash to display a Supplier
			// oCrossAppNavigator.toExternal({
			// 	target: {
			// 		shellHash: hash
			// 	}
			// }); // navigate to Supplier application

			if (sap.ushell && sap.ushell.Container) {

				sap.ushell.Container.getServiceAsync("Navigation")
					.then(function (oNavigation) {
						// this._fnSaveState();
						return oNavigation.navigate({
							target: {
								semanticObject: "cwsnedrequestscreen",
								action: "display"
							},
							params: {}
						});
					}.bind(this))
					.catch(function (err) {
						console.error("Request Navigation failed", err);
					});
			}
		},

		_headerToken: function (component) {
			var token = component.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			return oHeaders;
		},
		_rejStatusCount: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			var aFilter = [];
			aFilter = this._fnEssRejReq(component);
			return aFilter;
		},
		_setInProcessCount: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			var aFilter = [];
			aFilter = this._fnEssProcess(component);
			return aFilter;
		},
		_setPostedStatusCount: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			var aFilter = [];
			aFilter = this._fnEssPost(component);
			return aFilter;
		},
		_setWithdrawnCount: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			var aFilter = [];
			aFilter = this._fnWithdrawn(component);
			return aFilter;
		},
		_setWithcloseCount: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			var aFilter = [];
			aFilter = this._fnClosed(component);
			return aFilter;
		},

		_setDeleteCount: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			var aFilter = [];
			aFilter = this._fnDelete(component);
			return aFilter;
		},

		_setPendReqStatusCount: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			var aFilter = [];
			if (userRole === 'CA') {
				aFilter = this._fnCAPendReq(component);
			}
			return aFilter;
		},
		_handleIconTabBarSelect: function (component, sKey) {
			var userRole = component.AppModel.getProperty("/userRole");
			var aFilter = [];
			if (sKey === 'RejReq') {
				aFilter = this._fnEssRejReq(component);
			}
			if (sKey === 'Process') {
				aFilter = this._fnEssProcess(component);
			}
			if (sKey === 'Post') {
				aFilter = this._fnEssPost(component);
			}
			if (sKey === 'Withdrawn') {
				aFilter = this._fnWithdrawn(component);
			}
			if (sKey === "ClosedReq") {
				aFilter = this._fnClosed(component);
			}
			if (sKey === "Deleted") {
				aFilter = this._fnDelete(component);
			}
			return aFilter;
		},


		retrieveRequestTypes: function (component, isRetrieve, callBack) {
			var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
			var type = component.AppModel.getProperty("/cwsRequest/createCWSRequest/TYPE");
			var that = this;
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oCatalogSrvModel, component, this._fnLookupFilter("REFERENCE_KEY", type),
				function (oData) {
					component.AppModel.setProperty("/requestTypes", oData.results);
					var selectedRequestType = component.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_TYPE");
					if (oData.results instanceof Array && oData.results.length > 0) {
						if (isRetrieve && selectedRequestType) { //Retrieved From Database
							jQuery.sap.each(oData.results, function (i, requestElement) {
								if (selectedRequestType === requestElement.CONFIG_KEY) {
									component.AppModel.setProperty("/requestTypes/" + i + "/isSelected", true);
									component.AppModel.setProperty("/cwsRequest/createCWSRequest/REQUEST_TYPE_DESC", requestElement.CONFIG_VALUE);
								}
							});
						} else {
							component.AppModel.setProperty("/cwsRequest/createCWSRequest/PROCESS_CODE", oData.results[0].REFERENCE_VALUE);
						}
						if (oData.results.length === 1) {
							component.AppModel.setProperty("/requestTypes/0/isSelectionEnabled", true);
							component.AppModel.setProperty("/requestTypes/0/isSelected", true);
							component.AppModel.setProperty("/cwsRequest/createCWSRequest/REQUEST_TYPE", oData.results[0].CONFIG_KEY);
							component.AppModel.setProperty("/cwsRequest/createCWSRequest/REQUEST_TYPE_DESC", oData.results[0].CONFIG_VALUE);
						}
						that.initializeDependentLookups(component);
						callBack();
					}
				}.bind(this));
		},
		initializeDependentLookups: function (component) {
			this.retrieveSubTypes(component);
		},
		retrieveSubTypes: function (component) {
			var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
			var requestType = component.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_TYPE");
			if (requestType) {
				Services.readLookups(Config.dbOperations.cwsAppConfigs, oCatalogSrvModel, component, this._fnLookupFilter("REFERENCE_KEY",
					requestType + "_ST"),
					function (oData) {
						component.AppModel.setProperty("/subTypes", oData.results);
					}.bind(this));
			}
		},

		retrieveWaivers: function (component) {
			var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oCatalogSrvModel, component, this._fnLookupFilter("REFERENCE_KEY", "WAIVER"),
				function (oData) {
					component.AppModel.setProperty("/waiverList", oData.results);
				}.bind(this));
		},
		retrieveTypes: function (component) {
			var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oCatalogSrvModel, component, this._fnLookupFilter("REFERENCE_KEY", "TYPE"),
				function (oData) {
					component.AppModel.setProperty("/typesList", oData.results);
				}.bind(this));
		},
		retrieveRemunerationType: function (component, isRetrieve) {
			var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oCatalogSrvModel, component, this._fnLookupFilter("REFERENCE_KEY",
				"REMUNERATION_TYPE"),
				function (oData) {
					component.AppModel.setProperty("/remunerationList", oData.results);
					if (oData.results instanceof Array && oData.results.length > 0) {
						component.AppModel.setProperty("/cwsRequest/createCWSRequest/paymentList/0/REMUNERATION_TYPE", component.getI18n(
							"CwsRequest.Rmn.Monetary"));
					}
				}.bind(this));
		},
		retrieveAttachmentTypes: function (component) {
			var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oCatalogSrvModel, component, this._fnLookupFilter("REFERENCE_KEY",
				"ATTACHMENT_TYPE_OPWN"),
				function (oData) {
					component.AppModel.setProperty("/attachmentTypes", oData.results);
				}.bind(this));
		},
		retrieveLocations: function (component) {
			var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oCatalogSrvModel, component, this._fnLookupFilter("REFERENCE_KEY",
				"LOCATION"),
				function (oData) {
					component.AppModel.setProperty("/locations", oData.results);
				}.bind(this));
		},
		retrieveWorkTypes: function (component) {
			var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oCatalogSrvModel, component, this._fnLookupFilter("REFERENCE_KEY",
				"WORK_TYPE"),
				function (oData) {
					component.AppModel.setProperty("/workTypes", oData.results);
				}.bind(this));
		},

		retrieveUnitType: function (component) {
			var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oCatalogSrvModel, component, this._fnLookupFilter("REFERENCE_KEY",
				"UNIT_TYPE"),
				function (oData) {
					component.AppModel.setProperty("/unitTypes", oData.results);
				}.bind(this));
		},

		retrievePaymentType: function (component) {
			var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oCatalogSrvModel, component, this._fnLookupFilter("REFERENCE_KEY",
				"PAYMENT_TYPE"),
				function (oData) {
					component.AppModel.setProperty("/paymentTypes", oData.results);
				}.bind(this));
		},

		retrieveLevyDetails: function (component, isRetrieve) {
			var oCatalogSrvModel = component.getComponentModel("CatalogSrvModel");
			var type = component.AppModel.getProperty("/cwsRequest/createCWSRequest/TYPE");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oCatalogSrvModel, component, this._fnLookupFilter("REFERENCE_KEY", type +
				"_LEVY"),
				function (oData) {
					component.AppModel.setProperty("/levyList", oData.results);

					//Levy Calculation in the case 
					var levyPercent = (component.AppModel.getProperty("/cwsRequest") && component.AppModel.getProperty(
						"/cwsRequest/createCWSRequest")) ? component.AppModel.getProperty("/cwsRequest/createCWSRequest/LEVY_PERCENT") : 0;
					if (!levyPercent) {
						component.fnLevyCalculation();
					}
				}.bind(this));
		},
		_fnLookupFilter: function (property, value) {
			var aFilter = [];
			aFilter.push(new sap.ui.model.Filter(property, FilterOperator.EQ, value));
			return aFilter;
		},
		_fnEssDraft: function (component) {
			var staffId = component.AppModel.getProperty("/loggedInUserSfStfNumber");
			var FDLU = component.AppModel.getProperty("/primaryAssigment/FDLU_C");
			var ULU = component.AppModel.getProperty("/primaryAssigment/ULU_C");
			var oRole = component.AppModel.getProperty("/userRole");
			var andFilter = [];
			var aFilter = [];
			var orFilter = [];
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '31'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '46'));
			// orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '49'));
			andFilter.push(new sap.ui.model.Filter(orFilter, false));
			if (oRole === component.getI18n("CwsRequest.PrgAdmin")) {
				var submittedByFilter = new Filter("SUBMITTED_BY", FilterOperator.EQ, staffId);
				var staffIdFilter = new Filter("STAFF_ID", FilterOperator.EQ, staffId);
				var FDLUFilter = new Filter("FDLU", FilterOperator.EQ, FDLU);
				var ULUFilter = new Filter("ULU", FilterOperator.EQ, ULU);
				var cFilter = new Filter([FDLUFilter, ULUFilter], true);
				var StaffBy = new Filter([submittedByFilter, staffIdFilter], false);
				andFilter.push(new sap.ui.model.Filter([cFilter, StaffBy], false));
			} else {
				var sFilter = new sap.ui.model.Filter([
					new sap.ui.model.Filter("SUBMITTED_BY", FilterOperator.EQ, staffId),
					new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, staffId)
				], false);
				andFilter.push(new sap.ui.model.Filter(sFilter, false));
			}
			andFilter.push(new sap.ui.model.Filter("REQUEST_TYPE", FilterOperator.EQ, 'OPWN'));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			return aFilter;
		},
		_fnEssRejReq: function (component) {
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			var FDLU = component.AppModel.getProperty("/primaryAssigment/FDLU_C");
			var ULU = component.AppModel.getProperty("/primaryAssigment/ULU_C");
			var oRole = component.AppModel.getProperty("/userRole");
			var andFilter = [];
			var aFilter = [];
			var orFilter = [];
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '41'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '44')); // retract
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '45')); // Dept amdin
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '46'));
			andFilter.push(new sap.ui.model.Filter(orFilter, false));
			if (oRole === component.getI18n("CwsRequest.PrgAdmin")) {
				var submittedByFilter = new Filter("SUBMITTED_BY", FilterOperator.EQ, staffId);
				var staffIdFilter = new Filter("STAFF_ID", FilterOperator.EQ, staffId);
				var FDLUFilter = new Filter("FDLU", FilterOperator.EQ, FDLU);
				var ULUFilter = new Filter("ULU", FilterOperator.EQ, ULU);
				var cFilter = new Filter([FDLUFilter, ULUFilter], true);
				var StaffBy = new Filter([submittedByFilter, staffIdFilter], false);
				andFilter.push(new sap.ui.model.Filter([cFilter, StaffBy], false));
			} else {
				var sFilter = new sap.ui.model.Filter([
					new sap.ui.model.Filter("SUBMITTED_BY", FilterOperator.EQ, staffId),
					new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, staffId)
				], false);
				andFilter.push(new sap.ui.model.Filter(sFilter, false));
			}
			andFilter.push(new sap.ui.model.Filter("REQUEST_TYPE", FilterOperator.EQ, 'OPWN'));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			return aFilter;
		},
		_fnEssPost: function (component) {
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			var FDLU = component.AppModel.getProperty("/primaryAssigment/FDLU_C");
			var ULU = component.AppModel.getProperty("/primaryAssigment/ULU_C");
			var oRole = component.AppModel.getProperty("/userRole");
			var isDeptOhrss = component.AppModel.getProperty("/isDeptOHRSS");
			var andFilter = [];
			var aFilter = [];
			var orFilter = [];
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '38')); // completed
			andFilter.push(new sap.ui.model.Filter("TO_DISPLAY", FilterOperator.EQ, 'Y'));
			andFilter.push(new sap.ui.model.Filter(orFilter, false));

			var modifiedBy = new Filter("MODIFIED_BY", FilterOperator.EQ, staffId);
			var oMigratedC = new Filter("MIGRATED", FilterOperator.EQ, 'MC');
			var oMigratedG = new Filter("MIGRATED", FilterOperator.EQ, 'MG');
			var orMigrate = new Filter([oMigratedC, oMigratedG], false);
			var oMigrateFilter = new Filter([modifiedBy, orMigrate], true);

			if (oRole === component.getI18n("CwsRequest.PrgAdmin") && !isDeptOhrss) {
				var submittedByFilter = new Filter("SUBMITTED_BY", FilterOperator.EQ, staffId);
				var staffIdFilter = new Filter("STAFF_ID", FilterOperator.EQ, staffId);
				var FDLUFilter = new Filter("FDLU", FilterOperator.EQ, FDLU);
				var ULUFilter = new Filter("ULU", FilterOperator.EQ, ULU);
				var cFilter = new Filter([FDLUFilter, ULUFilter], true);
				var StaffBy = new Filter([submittedByFilter, staffIdFilter], false);
				andFilter.push(new sap.ui.model.Filter([cFilter, StaffBy, oMigrateFilter], false));
			} else if (isDeptOhrss) {
				// 
			} else {
				var sFilter = new sap.ui.model.Filter([
					new sap.ui.model.Filter("SUBMITTED_BY", FilterOperator.EQ, staffId),
					new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, staffId)
				], false);
				andFilter.push(new sap.ui.model.Filter(sFilter, false));
			}

			andFilter.push(new sap.ui.model.Filter("REQUEST_TYPE", FilterOperator.EQ, 'OPWN'));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			return aFilter;
		},
		_fnEssProcess: function (component) {
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			var FDLU = component.AppModel.getProperty("/primaryAssigment/FDLU_C");
			var ULU = component.AppModel.getProperty("/primaryAssigment/ULU_C");
			var oRole = component.AppModel.getProperty("/userRole");
			var andFilter = [];
			var aFilter = [];
			var orFilter = [];
			//02,03,04,05,06,08
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '40'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '42'));
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '43'));
			andFilter.push(new sap.ui.model.Filter(orFilter, false));
			if (oRole === component.getI18n("CwsRequest.PrgAdmin")) {
				var submittedByFilter = new Filter("SUBMITTED_BY", FilterOperator.EQ, staffId);
				var staffIdFilter = new Filter("STAFF_ID", FilterOperator.EQ, staffId);
				var FDLUFilter = new Filter("FDLU", FilterOperator.EQ, FDLU);
				var ULUFilter = new Filter("ULU", FilterOperator.EQ, ULU);
				var cFilter = new Filter([FDLUFilter, ULUFilter], true);
				var StaffBy = new Filter([submittedByFilter, staffIdFilter], false);
				andFilter.push(new sap.ui.model.Filter([cFilter, StaffBy], false));
			} else {
				var sFilter = new sap.ui.model.Filter([
					new sap.ui.model.Filter("SUBMITTED_BY", FilterOperator.EQ, staffId),
					new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, staffId)
				], false);
				andFilter.push(new sap.ui.model.Filter(sFilter, false));
			}
			andFilter.push(new sap.ui.model.Filter("REQUEST_TYPE", FilterOperator.EQ, 'OPWN'));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			return aFilter;
		},

		_fnWithdrawn: function (component) {
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			var FDLU = component.AppModel.getProperty("/primaryAssigment/FDLU_C");
			var ULU = component.AppModel.getProperty("/primaryAssigment/ULU_C");
			var oRole = component.AppModel.getProperty("/userRole");
			var isDeptOhrss = component.AppModel.getProperty("/isDeptOHRSS");
			var andFilter = [];
			var aFilter = [];
			var orFilter = [];
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '39')); // withdraw
			andFilter.push(new sap.ui.model.Filter(orFilter, false));
			if (oRole === component.getI18n("CwsRequest.PrgAdmin") && !isDeptOhrss) {
				var submittedByFilter = new Filter("SUBMITTED_BY", FilterOperator.EQ, staffId);
				var staffIdFilter = new Filter("STAFF_ID", FilterOperator.EQ, staffId);

				var FDLUFilter = new Filter("FDLU", FilterOperator.EQ, FDLU);
				var ULUFilter = new Filter("ULU", FilterOperator.EQ, ULU);
				var cFilter = new Filter([FDLUFilter, ULUFilter], true);
				var StaffBy = new Filter([submittedByFilter, staffIdFilter], false);
				andFilter.push(new sap.ui.model.Filter([cFilter, StaffBy], false));
			} else {
				var sFilter = new sap.ui.model.Filter([
					new sap.ui.model.Filter("SUBMITTED_BY", FilterOperator.EQ, staffId),
					new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, staffId)
				], false);

				if (isDeptOhrss) { //If OHRSS withdraws the Request
					sFilter = new sap.ui.model.Filter([
						new sap.ui.model.Filter("SUBMITTED_BY", FilterOperator.EQ, staffId),
						new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, staffId),
						new sap.ui.model.Filter("MODIFIED_BY", FilterOperator.EQ, staffId)
					], false);
				}

				andFilter.push(new sap.ui.model.Filter(sFilter, false));
			}
			andFilter.push(new sap.ui.model.Filter("REQUEST_TYPE", FilterOperator.EQ, 'OPWN'));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			return aFilter;
		},

		_fnClosed: function (component) {
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			var FDLU = component.AppModel.getProperty("/primaryAssigment/FDLU_C");
			var ULU = component.AppModel.getProperty("/primaryAssigment/ULU_C");
			var oRole = component.AppModel.getProperty("/userRole");
			var andFilter = [];
			var aFilter = [];
			var orFilter = [];
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '48')); // closed
			andFilter.push(new sap.ui.model.Filter(orFilter, false));
			if (oRole === component.getI18n("CwsRequest.PrgAdmin")) {
				var submittedByFilter = new Filter("SUBMITTED_BY", FilterOperator.EQ, staffId);
				var staffIdFilter = new Filter("STAFF_ID", FilterOperator.EQ, staffId);
				var FDLUFilter = new Filter("FDLU", FilterOperator.EQ, FDLU);
				var ULUFilter = new Filter("ULU", FilterOperator.EQ, ULU);
				var cFilter = new Filter([FDLUFilter, ULUFilter], true);
				var StaffBy = new Filter([submittedByFilter, staffIdFilter], false);
				andFilter.push(new sap.ui.model.Filter([cFilter, StaffBy], false));
			} else {
				var sFilter = new sap.ui.model.Filter([
					new sap.ui.model.Filter("SUBMITTED_BY", FilterOperator.EQ, staffId),
					new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, staffId)
				], false);
				andFilter.push(new sap.ui.model.Filter(sFilter, false));
			}
			andFilter.push(new sap.ui.model.Filter("REQUEST_TYPE", FilterOperator.EQ, 'OPWN'));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			return aFilter;
		},

		_fnDelete: function (component) {
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			var FDLU = component.AppModel.getProperty("/primaryAssigment/FDLU_C");
			var ULU = component.AppModel.getProperty("/primaryAssigment/ULU_C");
			var oRole = component.AppModel.getProperty("/userRole");
			var andFilter = [];
			var aFilter = [];
			var orFilter = [];
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '49')); // Mark for Deletion
			// andFilter.push(new sap.ui.model.Filter("TYPE", FilterOperator.EQ, 'EXT'));
			andFilter.push(new sap.ui.model.Filter(orFilter, false));
			if (oRole === component.getI18n("CwsRequest.PrgAdmin")) {
				var submittedByFilter = new Filter("SUBMITTED_BY", FilterOperator.EQ, staffId);
				var staffIdFilter = new Filter("STAFF_ID", FilterOperator.EQ, staffId);
				var FDLUFilter = new Filter("FDLU", FilterOperator.EQ, FDLU);
				var ULUFilter = new Filter("ULU", FilterOperator.EQ, ULU);
				var combinedFilter = new Filter([
					submittedByFilter,
					staffIdFilter,
					new Filter([FDLUFilter, ULUFilter], true)
				], false);
				andFilter.push(new sap.ui.model.Filter(combinedFilter, false));
			} else {
				var sFilter = new sap.ui.model.Filter([
					new sap.ui.model.Filter("SUBMITTED_BY", FilterOperator.EQ, staffId),
					new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, staffId)
				], false);
				andFilter.push(new sap.ui.model.Filter(sFilter, false));
			}
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			return aFilter;
		},

		_fnDeptAdminDraft: function (component) {
			var appMatrixAuth = component.AppModel.getProperty("/appMatrixAuth");
			var aFilter = [];
			var orFilter = [];
			orFilter.push(new sap.ui.model.Filter("REQUEST_STATUS", FilterOperator.EQ, '31'));
			var oUserBasedFilter = new sap.ui.model.Filter(orFilter, false);
			var oUluFdluMultipleList = this._fnFilterForDeptAdminOnUluFdlu(component, appMatrixAuth);
			aFilter.push(new sap.ui.model.Filter({
				filters: [oUserBasedFilter, oUluFdluMultipleList],
				and: true
			}));
			return aFilter;
		},
		_fnEssAllStatus: function (component) {
			var staffId = component.AppModel.getProperty("/loggedInUserStfNumber");
			var FDLU = component.AppModel.getProperty("/primaryAssigment/FDLU_C");
			var ULU = component.AppModel.getProperty("/primaryAssigment/ULU_C");
			var oRole = component.AppModel.getProperty("/userRole");
			var andFilter = [];
			var aFilter = [];
			if (oRole === component.getI18n("CwsRequest.PrgAdmin")) {
				var submittedByFilter = new Filter("SUBMITTED_BY", FilterOperator.EQ, staffId);
				var staffIdFilter = new Filter("STAFF_ID", FilterOperator.EQ, staffId);
				var FDLUFilter = new Filter("FDLU", FilterOperator.EQ, FDLU);
				var ULUFilter = new Filter("ULU", FilterOperator.EQ, ULU);
				var cFilter = new Filter([FDLUFilter, ULUFilter], true);
				var StaffBy = new Filter([submittedByFilter, staffIdFilter], false);
				andFilter.push(new sap.ui.model.Filter([cFilter, StaffBy], false));
			} else {
				var sFilter = new sap.ui.model.Filter([
					new sap.ui.model.Filter("SUBMITTED_BY", FilterOperator.EQ, staffId),
					new sap.ui.model.Filter("STAFF_ID", FilterOperator.EQ, staffId)
				], false);
				andFilter.push(new sap.ui.model.Filter(sFilter, false));
			}
			andFilter.push(new sap.ui.model.Filter("REQUEST_TYPE", FilterOperator.EQ, 'OPWN'));
			aFilter.push(new sap.ui.model.Filter(andFilter, true));
			return aFilter;
		},

		_fnFilterForDeptAdminOnUluFdlu: function (component, claimAuthorizations) {
			var aUluFdluFilter = [];
			var aFinalUluFdluFilter = [];
			jQuery.sap.each(claimAuthorizations, function (i, authElement) {
				aUluFdluFilter = [];
				if (authElement.STAFF_USER_GRP === component.getI18n("CwsRequest.User.DeptAdminAlias")) {
					aUluFdluFilter.push(new sap.ui.model.Filter("ULU", FilterOperator.EQ, authElement.ULU_C)); //testing ULU
					aUluFdluFilter.push(new sap.ui.model.Filter("FDLU", FilterOperator.EQ, authElement.FDLU_C)); //testing FDLU
					aFinalUluFdluFilter.push(new sap.ui.model.Filter(aUluFdluFilter, true));
				}
			});

			var oUluFdluMultipleList = new Filter({
				filters: aFinalUluFdluFilter,
				and: false
			});
			return oUluFdluMultipleList;
		},
		_generateFilter: function (sValueToFilter, aFilterValues, sOperator) {
			sOperator = sOperator || sap.ui.model.FilterOperator.EQ;
			var aFilterArray = aFilterValues.map(function (sFilterValue) {
				return new sap.ui.model.Filter(sValueToFilter, sOperator, sFilterValue);
			});
			return aFilterArray;
		},
		_bindItems: function (component, controlId, sPath, oSorter, oTemplate, aFilter) {
			var oControl = component.getUIControl(controlId);
			oControl.bindItems({
				path: sPath,
				sorter: oSorter,
				template: oTemplate,
				filters: aFilter //filters //oFilter//filters
			});
		},
		_handleOpenFragment: function (component, fragmentName, fragId, sDialogTab) {
			component._oDialog = null;
			component._oDialog = undefined;
			if (!component._oDialog) {
				component._oDialog = sap.ui.xmlfragment(fragId,
					fragmentName, component);
				component.getView().addDependent(component._oDialog);
			}
			if (sDialogTab) {
				component._oDialog.open(sDialogTab);
			} else {
				component._oDialog.open();
			}

		},
		_handleCloseOpenedFragment: function (component) {
			if (component._oDialog) {
				component._oDialog.destroy();
				component._oDialog = null;
				component._oDialog = undefined;
			}
		},
		_handleOpenPopOver: function (oEvent, component, _pQuickView, fragmentName, fragId) {
			var oButton = oEvent.getSource(),
				oView = component.getView();

			if (!component._pQuickView) {
				component._pQuickView = Fragment.load({
					id: fragId,
					name: fragmentName,
					controller: component
				}).then(function (oQuickView) {
					oView.addDependent(oQuickView);
					return oQuickView;
				});
			}
			component._pQuickView.then(function (oQuickView) {
				oQuickView.openBy(oButton);
			});
		},

		capitalizeWords: function (str) {
			str = str.toLowerCase();
			return str.replace(/\b\w/g, (match) => match.toUpperCase());
		},
		_onPressSearchCWRequest: function (sValue, component) {
			var filterNusNetId = new sap.ui.model.Filter([
				new sap.ui.model.Filter("STAFF_NUSNET_ID", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
				new sap.ui.model.Filter("STAFF_NUSNET_ID", sap.ui.model.FilterOperator.Contains, sValue.toLowerCase()),
				new sap.ui.model.Filter("STAFF_NUSNET_ID", sap.ui.model.FilterOperator.Contains, this.capitalizeWords(sValue))
			], false);

			var filterProcess = new sap.ui.model.Filter([
				new sap.ui.model.Filter("PROCESS_TITLE", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
				new sap.ui.model.Filter("PROCESS_TITLE", sap.ui.model.FilterOperator.Contains, sValue.toLowerCase()),
				new sap.ui.model.Filter("PROCESS_TITLE", sap.ui.model.FilterOperator.Contains, this.capitalizeWords(sValue))
			], false);

			var filterSubtype = new sap.ui.model.Filter([
				new sap.ui.model.Filter("SUB_TYPE_T", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
				new sap.ui.model.Filter("SUB_TYPE_T", sap.ui.model.FilterOperator.Contains, sValue.toLowerCase()),
				new sap.ui.model.Filter("SUB_TYPE_T", sap.ui.model.FilterOperator.Contains, this.capitalizeWords(sValue))
			], false);

			var filterFullName = new sap.ui.model.Filter([
				new sap.ui.model.Filter("FULL_NM", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
				new sap.ui.model.Filter("FULL_NM", sap.ui.model.FilterOperator.Contains, sValue.toLowerCase()),
				new sap.ui.model.Filter("FULL_NM", sap.ui.model.FilterOperator.Contains, this.capitalizeWords(sValue))
			], false);

			var filterSfStfNumber = new sap.ui.model.Filter("SF_STF_NUMBER", sap.ui.model.FilterOperator.Contains, sValue);
			var filterStfNumber = new sap.ui.model.Filter("STAFF_ID", sap.ui.model.FilterOperator.Contains, sValue);
			// var filterReqType = new sap.ui.model.Filter("REQUEST_TYPE", sap.ui.model.FilterOperator.Contains, sValue);
			var filterSubmittedByNid = new sap.ui.model.Filter([
				new sap.ui.model.Filter("SUBMITTED_BY_FULLNAME", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
				new sap.ui.model.Filter("SUBMITTED_BY_FULLNAME", sap.ui.model.FilterOperator.Contains, sValue.toLowerCase()),
				new sap.ui.model.Filter("SUBMITTED_BY_FULLNAME", sap.ui.model.FilterOperator.Contains, this.capitalizeWords(sValue))
			], false);
			// Begin of change - CCEV3364
			// var filterRequestId = new sap.ui.model.Filter("REQUEST_ID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterRequestId = new sap.ui.model.Filter("REQUEST_ID", sap.ui.model.FilterOperator.Contains, sValue.trim());
			// End of change - CCEV3364
			var filterAmount = new sap.ui.model.Filter("AMOUNT", sap.ui.model.FilterOperator.EQ, sValue);
			var filterStatusAlias = new sap.ui.model.Filter([
				new sap.ui.model.Filter("STATUS_ALIAS", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
				new sap.ui.model.Filter("STATUS_ALIAS", sap.ui.model.FilterOperator.Contains, sValue.toLowerCase()),
				new sap.ui.model.Filter("STATUS_ALIAS", sap.ui.model.FilterOperator.Contains, this.capitalizeWords(sValue))
			], false);
			var filterPrgmName = new sap.ui.model.Filter([
				new sap.ui.model.Filter("PROGRAM_NAME", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
				new sap.ui.model.Filter("PROGRAM_NAME", sap.ui.model.FilterOperator.Contains, sValue.toLowerCase()),
				new sap.ui.model.Filter("PROGRAM_NAME", sap.ui.model.FilterOperator.Contains, this.capitalizeWords(sValue))
			], false);

			var filtersGrp = new Filter({
				filters: [filterNusNetId, filterProcess, filterSubtype, filterFullName,
					filterSfStfNumber, filterStfNumber, filterSubmittedByNid, filterRequestId,
					filterStatusAlias, filterPrgmName
				],
				and: false
			});

			var globalFiltersGrp = new Filter({
				filters: component.GlobalFilterForTable,
				and: false
			});

			var finalFilterGrp = new Filter({
				filters: [globalFiltersGrp, filtersGrp],
				and: true
			});
			return [finalFilterGrp];
		},
		_filterSortingRequestTable: function (component, oTable, sValue, oSelectedSort, sortingMethod, oSelectedGroup, groupMethod) {
			var filterNusNetId = new sap.ui.model.Filter("STAFF_NUSNET_ID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFullName = new sap.ui.model.Filter("FULL_NM", sap.ui.model.FilterOperator.Contains, sValue);
			var filterSfStfNumber = new sap.ui.model.Filter("SF_STF_NUMBER", sap.ui.model.FilterOperator.Contains, sValue);
			var filterStfNumber = new sap.ui.model.Filter("STAFF_ID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterRequestType = new sap.ui.model.Filter("REQUEST_TYPE", sap.ui.model.FilterOperator.Contains, sValue);
			var filterSubmittedByNid = new sap.ui.model.Filter("SUBMITTED_BY", sap.ui.model.FilterOperator.Contains, sValue);
			var filterRequestId = new sap.ui.model.Filter("REQUEST_ID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterStatusAlias = new sap.ui.model.Filter("STATUS_ALIAS", sap.ui.model.FilterOperator.Contains, sValue);
			var filterPrgmName = new sap.ui.model.Filter("PROGRAM_NAME", sap.ui.model.FilterOperator.Contains, sValue);

			var filtersGrp = new Filter({
				filters: [filterNusNetId, filterFullName,
					filterSfStfNumber, filterStfNumber, filterRequestType, filterSubmittedByNid, filterRequestId,
					filterStatusAlias, filterPrgmName
				],
				and: false
			});
			var globalFiltersGrp = new Filter({
				filters: component.GlobalFilterForTable,
				and: false
			});

			var finalFilterGrp = new Filter({
				filters: [globalFiltersGrp, filtersGrp],
				and: true
			});
			var oBinding = oTable.getBinding("items");
			//handling filter mechanism
			oBinding.filter([finalFilterGrp], FilterType.Application); //apply the filter

			var aSorter = [];
			//handle grouping mechanism
			if (oSelectedGroup) {
				var groupColumn = oSelectedGroup.getProperty("key");
				aSorter.push(new Sorter({
					path: groupColumn,
					group: true,
					descending: groupMethod
				}));
			}

			//handling sorting mechanism
			var sortingColumn = oSelectedSort.getProperty("key");
			switch (sortingColumn) {
				case "Period":
					aSorter.push(new Sorter({
						path: "CLAIM_YEAR",
						descending: sortingMethod
					}));
					aSorter.push(new Sorter({
						path: "CLAIM_MONTH",
						descending: sortingMethod
					}));
					break;
				default:
					aSorter.push(new Sorter({
						path: sortingColumn,
						descending: sortingMethod
					}));
					break;
			}
			oBinding.sort(aSorter);
		},
		// _fnOpenQuickViewForDepartmentAdmin: function (component, serviceUrl) {
		// 	component.AppModel.setProperty("/employeeInformation/pageId", component.AppModel.getProperty("/loggedInUserStfNumber"));
		// 	component.AppModel.setProperty("/employeeInformation/FULL_NM", component.AppModel.getProperty("/staffInfo/FULL_NM"));
		// 	component.AppModel.setProperty("/employeeInformation/WORK_TITLE", "Claim Assistant (E-Claims)");
		// 	var oHeaders = this._headerToken(component);
		// 	Services._loadDataUsingJsonModel(serviceUrl, null, "GET", oHeaders, function (oData) {
		// 		component.AppModel.setProperty("/employeeInformation/groups", [oData.getSource().getData()]);
		// 	}.bind(component));
		// },
		_fnOpenQuickViewForStaff: function (component) {
			var aFilter = [];
			aFilter.push(new Filter("NUSNET_ID", FilterOperator.EQ, component.AppModel.getProperty("/loggedInUserId").toString()));
			aFilter.push(new Filter("STF_NUMBER", FilterOperator.EQ, component.AppModel.getProperty("/loggedInUserStfNumber")));
			aFilter.push(new Filter("SF_STF_NUMBER", FilterOperator.EQ, component.AppModel.getProperty("/loggedInUserSfStfNumber")));
			var filters = new Filter({
				filters: aFilter,
				and: true
			});
			let oDataModel = component.getComponentModel("CatalogSrvModel");
			// var serviceUrl = Config.dbOperations.userLookup;
			Services._readDataUsingOdataModel(Config.dbOperations.userLookup, oDataModel, component, [filters], function (oData) {
				if (oData.results.length) {
					var isEntered = false;
					var sUluFdlu = "";
					for (var t = 0; t < oData.results.length; t++) {

						var objAssign = oData.results[t];
						if (new Date() >= new Date(objAssign.START_DATE) && new Date() <= new Date(objAssign.END_DATE)) {
							component.AppModel.setProperty("/employeeInformation/pageId", objAssign.STF_NUMBER);
							component.AppModel.setProperty("/employeeInformation/FULL_NM", objAssign.FULL_NM);
							component.AppModel.setProperty("/employeeInformation/WORK_TITLE", objAssign.WORK_TITLE);
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/0/value", objAssign.COMPANY_T);
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/2/value", objAssign.JOB_GRD_T + "(" + objAssign.JOB_GRD_C +
								")");
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/3/value", objAssign.EMAIL);
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/4/value", objAssign.EMP_CAT_T);

							if (isEntered) {
								sUluFdlu = sUluFdlu.concat("\n\n", objAssign.ULU_T).concat("(", objAssign.ULU_C).concat(") / ",
									objAssign.FDLU_T).concat("(", objAssign.FDLU_C).concat(")", "")
							} else {
								sUluFdlu = sUluFdlu.concat("", objAssign.ULU_T).concat("(", objAssign.ULU_C).concat(") \n ",
									objAssign.FDLU_T).concat("(", objAssign.FDLU_C).concat(")", "")
							}
							isEntered = true;
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/1/value", sUluFdlu);
						}
					}
				}
			}.bind(component));

		},
		_fnHandleStaffId: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			if (userRole === component.getI18n("CwsRequest.User.StaffAlias")) {
				return component.AppModel.getProperty("/loggedInUserId");
			}
			if (userRole === component.getI18n("CwsRequest.User.DeptAdminAlias")) {
				return component.AppModel.getProperty("/loggedInUserId");
			} else {
				return component.AppModel.getProperty("/loggedInUserId");
			}

		},
		handlingSession: function (component) {
			this.setIdleTimeout(15000, function () { }, function () { });
		},
		_fnSortingEclaimItemData: function (claimItems) {
			claimItems.sort(
				(objA, objB) => Number(new Date(objA.CLAIM_START_DATE)) - Number(new Date(objB.CLAIM_START_DATE)),
			);
			return claimItems;
		},

		setIdleTimeout: function (millis, onIdle, onUnidle) {
			var timeout = 0;
			startTimer();

			function startTimer() {
				timeout = setTimeout(onExpires, millis);
				document.addEventListener("mousemove", onActivity);
				document.addEventListener("keydown", onActivity);
				document.addEventListener("touchstart", onActivity);
			}

			function onExpires() {
				timeout = 0;
				onIdle();
			}

			function onActivity() {
				if (timeout) clearTimeout(timeout);
				else onUnidle();
				//since the mouse is moving, we turn off our event hooks for 1 second
				document.removeEventListener("mousemove", onActivity);
				document.removeEventListener("keydown", onActivity);
				document.removeEventListener("touchstart", onActivity);
				setTimeout(startTimer, 1000);
			}
		},
		_clearModelBeforeNavigationToCWDetailView: function (component) {
			component.AppModel.setProperty("/cwsRequest/createCWSRequest", AppConstant.cwsRequest.createCWSRequest); //to clear before navigating to the next screens
		},
		_fnSubmitClaim: function (component, callBackFx) {
			var serviceUrl = Config.dbOperations.postClaim;
			var oHeaders = this._headerToken(component);
			Services._loadDataUsingJsonModel(serviceUrl, component.aSaveObj, "POST", oHeaders, function (oData) {
				callBackFx(oData);
			}.bind(this));
		},
		_fnValidateClaim: function (component, callBackFx) {
			var serviceUrl = Config.dbOperations.validateClaim;
			var oHeaders = this._headerToken(component);
			Services._loadDataUsingJsonModel(serviceUrl, component.aSaveObj, "POST", oHeaders, function (oData) {
				callBackFx(oData);
			}.bind(this));
		},
		_fnCrossAppNavigationToInbox: function () {
			// var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"); // get a handle on the global XAppNav service
			// var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
			// 	target: {
			// 		semanticObject: "inbox",
			// 		action: "Display"
			// 		// semanticObject: "myinboxdev",
			// 		// action: "display"
			// 	},
			// 	params: {}
			// })) || ""; // generate the Hash to display a Supplier
			// // hash = hash + "&/taskdetail/" + project + "/" + objData.TASK_INST_ID + "/" + layout;
			// oCrossAppNavigator.toExternal({
			// 	target: {
			// 		shellHash: hash
			// 	}
			// }); // navigate to Supplier application

			if (sap.ushell && sap.ushell.Container) {

				sap.ushell.Container.getServiceAsync("Navigation")
					.then(function (oNavigation) {
						// this._fnSaveState();
						return oNavigation.navigate({
							target: {
								semanticObject: "inbox",
								action: "Display"
							},
							params: {}
						});
					}.bind(this))
					.catch(function (err) {
						console.error("Request Navigation failed", err);
					});
			}

		},

		_fnCrossAppNavigationToReport: function () {
			// var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"); // get a handle on the global XAppNav service
			// var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
			// 	target: {
			// 		semanticObject: "cwnedreport",
			// 		action: "Display"
			// 	},
			// 	params: {}
			// })) || "";
			// oCrossAppNavigator.toExternal({
			// 	target: {
			// 		shellHash: hash
			// 	}
			// });

			if (sap.ushell && sap.ushell.Container) {
				// var that = this;
				sap.ushell.Container.getServiceAsync("Navigation")
					.then(function (oNavigation) {
						// that._fnSaveState();
						return oNavigation.navigate({
							target: {
								semanticObject: "cwnedreport",
								action: "Display"
							},
							params: {}
						});
					})
					.catch(function (err) {
						console.error("Request Navigation failed", err);
					});
			}
		},

		_fnCrossAppNavigationToofn: function () {
			// var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"); // get a handle on the global XAppNav service
			// var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
			// 	target: {
			// 		semanticObject: "ofnreportview",
			// 		action: "Display"
			// 	},
			// 	params: {}
			// })) || "";
			// oCrossAppNavigator.toExternal({
			// 	target: {
			// 		shellHash: hash
			// 	}
			// });

			if (sap.ushell && sap.ushell.Container) {
				// var that = this;
				sap.ushell.Container.getServiceAsync("Navigation")
					.then(function (oNavigation) {
						// that._fnSaveState();
						return oNavigation.navigate({
							target: {
								semanticObject: "ofnreportview",
								action: "Display"
							},
							params: {}
						});
					})
					.catch(function (err) {
						console.error("Request Navigation failed", err);
					});
			}

		},
		_fnSuccessDialog: function (component, sText, callBackFx, sDispInfo) {
			if (!component.oSucessDialog) {
				var aContents = [],
					oText = new Text({
						text: sText
					});
				oText.addStyleClass("sapUiSmallMarginBottom");
				aContents.push(oText);
				if (sDispInfo) {
					var oMsgInfo = new Text({
						text: component.getI18n("CwsRequest.DisplayNoChangeInProgramManager")
					}),
						oLowerStartMsg = new FlexBox({
							items: oMsgInfo,
							alignItems: "End",
							justifyContent: "Center"
						});
					// oMsgInfo.addStyleClass("sapUiTinyMarginTop");
					aContents.push(oLowerStartMsg);
				}
				component.oSucessDialog = new Dialog({
					type: "Message",
					title: "Success",
					state: "Success",
					titleAlignment: "Center",
					content: aContents,
					beginButton: new sap.m.Button({
						type: "Emphasized",
						text: "Ok",
						press: function () {
							component.oSucessDialog.close();
							component.oSucessDialog.destroy();
							component.oSucessDialog = null;
							component.oSucessDialog = undefined;
							return callBackFx();
						}.bind(this)
					})
				});
			}
			component.oSucessDialog.setEscapeHandler(function () {
				return;
			});
			component.oSucessDialog.open();
		},
		_fnErrorDialog: function (component, sText, callBackFx) {
			if (!component.oErrorDialog) {
				component.oErrorDialog = new Dialog({
					type: "Message",
					title: "Error",
					state: "Error",
					titleAlignment: "Center",
					content: new Text({
						text: sText
					}),
					beginButton: new sap.m.Button({
						type: "Emphasized",
						text: "Ok",
						press: function () {
							component.oErrorDialog.close();
							component.oErrorDialog.destroy();
							component.oErrorDialog = null;
							component.oErrorDialog = undefined;
							return callBackFx();
						}.bind(this)
					})
				});
			}
			component.oErrorDialog.setEscapeHandler(function () {
				return;
			});
			component.oErrorDialog.open();
		},

		_rebindAllUISections: function (component, postResponse) {

			//Manage Button Visibility
			if (postResponse.REQUEST_STATUS === '31') {
				component.AppModel.setProperty("/cwsRequest/createCWSRequest/statusDisplay", 'Draft');
				if (component.viaRequestorForm) {
					component.lastSuccessRun = new Date();
					component.runAutoSave = true;
					component._handleAutoSave();
				}
			}

			var uiData = component.AppModel.getProperty("/cwsRequest/createCWSRequest");
			uiData.REQ_UNIQUE_ID = postResponse.REQ_UNIQUE_ID;
			uiData.REQUEST_ID = postResponse.REQUEST_ID;

			var postResponseElement;

			//Year Split List
			jQuery.sap.each(uiData.durationSplitList, function (d, splitElement) {
				postResponseElement = postResponse.durationSplitList[d];
				if (postResponseElement && postResponseElement.SPLIT_ID && Number(splitElement.YEAR) === Number(postResponseElement.YEAR)) {
					splitElement.SPLIT_ID = postResponseElement.SPLIT_ID;
				}
			});

			//Assistance List
			jQuery.sap.each(uiData.assistanceList, function (d, assistElement) {
				postResponseElement = postResponse.assistanceList[d];
				if (postResponseElement && postResponseElement.ASSISTANCE_ID && assistElement.STAFF_ID === postResponseElement.STAFF_ID) {
					assistElement.ASSISTANCE_ID = postResponseElement.ASSISTANCE_ID;
				}
			});

			//Payment List
			jQuery.sap.each(uiData.paymentList, function (d, paymentElement) {
				postResponseElement = postResponse.paymentList[d];
				if (postResponseElement && postResponseElement.PAYMENT_ID && Number(paymentElement.YEAR) === Number(postResponseElement.YEAR)) {
					paymentElement.PAYMENT_ID = postResponseElement.PAYMENT_ID;
				}
			});

			component.AppModel.setProperty("/cwsRequest/createCWSRequest", uiData);
		},

		_createColumnClaimResponse: function (component, EdmType) {
			var aCols = [{
				label: component.getI18n("CwsRequest.RequestTable.RequestId"),
				property: 'REQUEST_ID',
				type: EdmType.String
			}, {
				label: 'Request Type',
				property: 'PROCESS_TITLE'
			}, {
				label: component.getI18n("CwsRequest.RequestTable.RequestType"),
				property: 'SUB_TYPE_T',
				type: EdmType.String
			}, {
				label: "Requested For",
				type: EdmType.String,
				property: 'FULL_NM'
			}, {
				label: component.getI18n("CwsRequest.RequestTable.StartDate"),
				property: 'START_DATE',
				type: EdmType.Date,
				format: 'dd mmm, yyyy'
			}, {
				label: component.getI18n("CwsRequest.RequestTable.EndDate"),
				property: 'END_DATE',
				type: EdmType.Date,
				format: 'dd mmm, yyyy'
			}, {
				label: component.getI18n("CwsRequest.RequestTable.Duration"),
				type: EdmType.String,
				property: 'DURATION_DAYS'
			}, {
				label: "Program Name",
				type: EdmType.String,
				property: 'PROGRAM_NAME'
			}, {
				label: component.getI18n("CwsRequest.RequestTable.Status"),
				property: 'STATUS_ALIAS',
				type: EdmType.String
			}, {
				label: "Submitted On",
				property: 'SUBMITTED_ON_TS',
				type: EdmType.Date,
				format: 'dd mmm, yyyy hh:mm:ss'
			}, {
				label: "Submitted By",
				property: 'SUBMITTED_BY_NID',
				type: EdmType.String
			}];
			return aCols;
		},

		_createColumnSubmissionResponse: function (component, EdmType) {
			var aCols = [{
				label: component.getI18n("CwsRequest.RequestTable.RequestId"),
				property: 'REQUEST_ID',
				type: EdmType.String
			}, {
				label: 'MassUpload Reference ID',
				property: 'MASS_REF_VAL'
			}, {
				label: 'Staff Name',
				property: 'FULL_NM',
				type: EdmType.String
			}, {
				label: component.getI18n("CwsRequest.RequestTable.StartDate"),
				property: 'START_DATE',
				type: EdmType.Date,
				format: 'dd mmm, yyyy'
			}, {
				label: component.getI18n("CwsRequest.RequestTable.EndDate"),
				property: 'END_DATE',
				type: EdmType.Date,
				format: 'dd mmm, yyyy'
			}, {
				label: 'Program Name',
				type: EdmType.String,
				property: 'PROGRAM_NAME'
			}, {
				label: "Message",
				type: EdmType.String,
				property: 'message'
			}];
			return aCols;
		},

		_fndurationLoad: function (dbdurationlist, year) {
			dbdurationlist = $.grep(dbdurationlist, function (n, i) {
				return n.IS_DELETED === 'N';
			});
			for (var i = 0; i < dbdurationlist.length; i++) {
				if (year === dbdurationlist[i].YEAR) {
					return dbdurationlist[i];
				}
			}
		},

		checkForLastRun: function (lastSuccessRun) {
			var currentDate = new Date();
			lastSuccessRun = (lastSuccessRun) ? lastSuccessRun : new Date();
			var isOk = false;
			if (lastSuccessRun) {
				var seconds = (currentDate.getTime() - lastSuccessRun.getTime()) / 1000;
				isOk = (seconds >= 30);
			}
			return isOk;
		},
		_fnHandleTaskAgent: function (component, loggedInStaffId, staffId, draftId, requestId, userRole, processCode, callBackFx) {
			var aRequestPayload = [];
			var oRequestPayload = {
				"loggedInStaffId": loggedInStaffId,
				"staffId": [staffId],
				"draftId": draftId,
				"requestId": requestId,
				"userRole": userRole,
				"processCode": processCode
			};
			aRequestPayload.push(oRequestPayload);
			// var oHeaders = this._headerToken(component);
			// var serviceUrl = Config.dbOperations.fetchTaskAgent;
			Services.getTaskAgent(component, aRequestPayload, function (taskAgentData) {
				callBackFx(taskAgentData);
				var bTaskAgentFlag = (taskAgentData.length) ? taskAgentData[0].isMatchingStaff : false;
				var bMessage = (taskAgentData.length) ? taskAgentData[0].message : '';
				return {
					bTaskAgentFlag: bTaskAgentFlag,
					bMessage: bMessage
				};
				// resolve();
			}.bind(component)
			);
			// var taskAgentModel = new JSONModel();
			// taskAgentModel.loadData(serviceUrl, JSON.stringify(aRequestPayload), false, "POST", null, null, oHeaders);
			// var bTaskAgentFlag = (taskAgentModel.getData().length) ? taskAgentModel.getData()[0].matchingStaff : false;
			// var bMessage = (taskAgentModel.getData().length) ? taskAgentModel.getData()[0].message : '';
			// return {
			// 	bTaskAgentFlag: bTaskAgentFlag,
			// 	bMessage: bMessage
			// };
		},
		handleVisibilityForTaskAgent: function (component, flagVal) {
			var buttonProps = component.getI18n("CwsRequest.TaskAgent.Props");
			jQuery.sap.each(buttonProps.split(","), function (i, element) {
				component.AppModel.setProperty("/" + element, flagVal);
			});
		},
		getFormattedWBS: function (wbsValue) {
			var formattedWbs = wbsValue && wbsValue.length > 0 ? wbsValue.replace(/-/g, '')
				.replace(/ /g, '')
				.replace(/[^a-zA-Z0-9_-]/g, '') : '';

			return formattedWbs;
		}
	});
	return utility;
},
	true);