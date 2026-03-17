sap.ui.define([
	"sap/ui/model/Filter",
	"./services",
	"./utility",
	"./headerHelper",
	"./configuration",
	"./dataformatter"
], function (Filter, Services, Utility,HeaderHelper, Config, Formatter) {
	"use strict";
	var requestlockhelper = ("nus.edu.sg.opwrequest.utils.requestlockhelper", {
		_settingClaimTypeValue: function (component) {
			var oHeaders = HeaderHelper._headerToken(component);
			var staffId = component.AppModel.getProperty("/loggedInUserId");
			var userRole = component.AppModel.getProperty("/userRole");
			if (userRole === "CA") {
				// var userGroup = "NUS_CHRS_ECLAIMS_CA"; //claim assistant
				var userGroup = "CLAIM_ASSISTANT"; //claim assistant
			} else if (userRole === "ESS") {
				userGroup = "NUS_CHRS_ECLAIMS_ESS"; // employee 
			}

			var serviceUrl = Config.dbOperations.fetchClaimType + staffId + "&userGroup=" + userGroup;

			Services._loadDataUsingJsonModel(serviceUrl, null, "GET", oHeaders, function (oData) {
				var aClaimTypeList = oData.getSource().getData();
				component.AppModel.setProperty("/claimRequest/claimTypeList", aClaimTypeList);
				if (aClaimTypeList.length === 1) {
					var objClaimType = {
						"SF_STF_NUMBER": aClaimTypeList[0].SF_STF_NUMBER,
						"STF_NUMBER": aClaimTypeList[0].STF_NUMBER,
						"START_DATE": aClaimTypeList[0].START_DATE,
						"END_DATE": aClaimTypeList[0].END_DATE,
						"CLAIM_TYPE_C": aClaimTypeList[0].CLAIM_TYPE_C,
						"CLAIM_TYPE_T": aClaimTypeList[0].CLAIM_TYPE_T,
						"SUBMISSION_END_DATE": aClaimTypeList[0].SUBMISSION_END_DATE,
						"PAST_MONTHS": aClaimTypeList[0].PAST_MONTHS,
						"JOIN_DATE": aClaimTypeList[0].JOIN_DATE
					};
					component.AppModel.setProperty("/claimRequest/createClaimRequest/claimTypeList", [objClaimType]);
					component.AppModel.setProperty("/claimRequest/createClaimRequest/claimType", aClaimTypeList[0].CLAIM_TYPE_C);
					component.AppModel.setProperty("/claimRequest/createClaimRequest/claimTypeDesc", aClaimTypeList[0].CLAIM_TYPE_T);

					var joinDate = Formatter.formatDateAsString(aClaimTypeList[0].JOIN_DATE, "yyyy-MM-dd");
					var startDate = Formatter.formatDateAsString(aClaimTypeList[0].START_DATE, "yyyy-MM-dd");
					var endDate = Formatter.formatDateAsString(aClaimTypeList[0].END_DATE, "yyyy-MM-dd");
					var pastMonths = parseInt(aClaimTypeList[0].PAST_MONTHS, 10);
					var totalMonths = pastMonths + 1;
					var currentDate = new Date();
					var currentYear = currentDate.getFullYear();
					var currentMonth = currentDate.getMonth();
					var monthListSet = [];
					if (userRole === "ESS") { //to uncomment and add the logic for CA
						for (var i = 0; i < totalMonths; i++) {
							var monthListSetItem = {};
							if (i === 0) {
								var currentMonthFirstDate = new Date(Number(currentYear), currentMonth, 1);
								currentMonthFirstDate = Formatter.formatDateAsString(currentMonthFirstDate, "yyyy-MM-dd");
								currentDate = Formatter.formatDateAsString(currentDate, "yyyy-MM-dd");
								if (currentMonthFirstDate >= startDate && currentMonthFirstDate <= endDate && currentDate >= startDate && currentDate <=
									endDate && joinDate <= currentDate) { //adding logic for joining date validation
									var monthnameEligible = component.AppModel.getProperty("/monthNames")[currentMonth];
									monthListSetItem.monthCode = currentYear + '-' + currentMonth;
									monthListSetItem.monthName = monthnameEligible + ',' + ' ' + currentYear;
									monthListSet.push(monthListSetItem);
								}
							} else {
								var prevMonth = currentMonth - i;
								var previousMonthFirstDate = new Date(Number(currentYear), prevMonth, 1);
								var previousMonthLastDate = new Date(Number(currentYear), prevMonth + 1, 0);
								previousMonthFirstDate = Formatter.formatDateAsString(previousMonthFirstDate, "yyyy-MM-dd");
								previousMonthLastDate = Formatter.formatDateAsString(previousMonthLastDate, "yyyy-MM-dd");
								if (previousMonthFirstDate >= startDate && previousMonthFirstDate <= endDate && previousMonthLastDate >= startDate &&
									previousMonthLastDate <= endDate && joinDate <= previousMonthLastDate) {
									monthnameEligible = component.AppModel.getProperty("/monthNames")[prevMonth];
									monthListSetItem.monthCode = currentYear + '-' + prevMonth;
									monthListSetItem.monthName = monthnameEligible + ',' + ' ' + currentYear;
									monthListSet.push(monthListSetItem);
								}
							}
						}

					}
					if (userRole === "CA") {
						for (var i = 0; i < totalMonths; i++) {
							var monthListSetItem = {};
							if (i === 0) {
								var currentMonthFirstDate = new Date(Number(currentYear), currentMonth, 1);

								currentMonthFirstDate = Formatter.formatDateAsString(currentMonthFirstDate, "yyyy-MM-dd");

								currentDate = Formatter.formatDateAsString(currentDate, "yyyy-MM-dd");
								var monthnameEligible = component.AppModel.getProperty("/monthNames")[currentMonth];
								monthListSetItem.monthCode = currentYear + '-' + currentMonth;
								monthListSetItem.monthName = monthnameEligible + ',' + ' ' + currentYear;
								monthListSet.push(monthListSetItem);
							} else {
								var prevMonth = currentMonth - i;
								var previousMonthFirstDate = new Date(Number(currentYear), prevMonth, 1);
								var previousMonthLastDate = new Date(Number(currentYear), prevMonth + 1, 0);
								previousMonthFirstDate = Formatter.formatDateAsString(previousMonthFirstDate, "yyyy-MM-dd");
								previousMonthLastDate = Formatter.formatDateAsString(previousMonthLastDate, "yyyy-MM-dd");
								monthnameEligible = component.AppModel.getProperty("/monthNames")[prevMonth];
								monthListSetItem.monthCode = currentYear + '-' + prevMonth;
								monthListSetItem.monthName = monthnameEligible + ',' + ' ' + currentYear;
								monthListSet.push(monthListSetItem);
								//	}
							}
						}
					}
					component.AppModel.setProperty("/claimRequest/monthList", monthListSet);

				}
			}.bind(component));

		},
		_settingUluFdluRadioButton: function (component) {
			var UluFdluList = [];
			var UluFdluListSetItem = {};
			var primaryAssigment = component.AppModel.getProperty("/primaryAssigment");
			//	monthCode = monthCode - 1;
			UluFdluListSetItem.Text = primaryAssigment.ULU_T.concat(" / ", primaryAssigment.FDLU_T);
			UluFdluListSetItem.Selected = true;
			UluFdluList.push(UluFdluListSetItem);

			var otherAssignments = component.AppModel.getProperty("/otherAssignments");

			for (var i = 0; i < otherAssignments.length; i++) {
				var UluFdluListSetItem = {};
				UluFdluListSetItem.Text = otherAssignments[i].ULU_T.concat(" / ", otherAssignments[i].FDLU_T);
				UluFdluListSetItem.Selected = false;
				UluFdluList.push(UluFdluListSetItem);
			}
			return UluFdluList;
		},
		_onSelectMonth: function (oEvent, component) {
			component.AppModel.setProperty("/claimRequest/createClaimRequest/monthName", oEvent.getParameters().selectedItem.getProperty("text"));
			var aSelectedMonth = oEvent.getParameters().selectedItem.getProperty("key");
			var selectedMonthYear = aSelectedMonth.split("-")[0];
			var selectedMonth = parseInt(aSelectedMonth.split("-")[1], 10);
			var actSelMonYearInNo;
			if ((selectedMonth + 1).toString().length === 1) {
				actSelMonYearInNo = (0 + (selectedMonth + 1).toString()) + '-' + selectedMonthYear;
			} else {
				actSelMonYearInNo = (selectedMonth + 1) + '-' + selectedMonthYear;
			}
			component.AppModel.setProperty("/claimRequest/createClaimRequest/actSelMonYearInNo", actSelMonYearInNo);
			component.AppModel.setProperty("/claimRequest/createClaimRequest/CLAIM_MONTH", selectedMonth);
			component.AppModel.setProperty("/claimRequest/createClaimRequest/CLAIM_YEAR", selectedMonthYear);
			component.AppModel.setProperty("/claimRequest/createClaimRequest/minDateMonth", new Date(selectedMonthYear, selectedMonth, 1));
			component.AppModel.setProperty("/claimRequest/createClaimRequest/maxDateMonth", new Date(selectedMonthYear, selectedMonth + 1, 0));
		},
		_confirmAction: function (component) {
			var selectedYear = component.AppModel.getProperty("/claimRequest/year");
			var claimType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimTypeList/0/CLAIM_TYPE_T");
			var selectedMonth = component.AppModel.getProperty("/claimRequest/createClaimRequest/month"); //Period
			var ulu = component.AppModel.getProperty("/claimRequest/createClaimRequest/uluSelected"); //ULU
			var fdlu = component.AppModel.getProperty("/claimRequest/createClaimRequest/fdluSelected"); //FDLU
			var singleSubRadioSelected = component.AppModel.getProperty("/claimRequest/SingleSubRadioSelected"); //Single submission radiobutton
			var staffId = component.AppModel.getProperty("/claimRequest/createClaimRequest/staffList/0/STAFF_FULL_NAME"); //Staff ID
			var claimRequestType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType"); //claim Request Type
			if (!claimType || !selectedMonth || !ulu || !fdlu) {
				component.showMessageStrip("claimTypeMessageStripId", "Please provide * required fields", "E", "ClaimTypeDialog");
			} else if (singleSubRadioSelected && (!staffId || !claimRequestType)) {
				component.showMessageStrip("claimTypeMessageStripId", "Please provide * required fields", "E", "ClaimTypeDialog");
			} else {
				component.showBusyIndicator();
				component.closeClaimTypeDialog();
				var month = component.AppModel.getProperty("/claimRequest/month");
				component.AppModel.setProperty("/claimRequest/minSelectedDate", new Date(Number(selectedYear), month, 1));
				component.AppModel.setProperty("/claimRequest/maxSelectedDate", new Date(Number(selectedYear), month, Formatter.getLastDay(Number(
						selectedYear),
					month)));

				if (component.AppModel.getProperty("/userRole") === "ESS") {
					staffId = component.AppModel.getProperty("/loggedInUserId");
				} else {
					staffId = component.AppModel.getProperty("/staffId");
				}

				component.oRouter.navTo("detail", {
					project: "NEW",
					layout: "MidColumnFullScreen"
				});

			}
		},
		_onPressSearchClaimRequest: function (sValue, component) {
			var filterNusNetId = new sap.ui.model.Filter("STAFF_NUSNET_ID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFdluCode = new sap.ui.model.Filter("FDLU", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFdluText = new sap.ui.model.Filter("FDLU_T", sap.ui.model.FilterOperator.Contains, sValue);
			var filterFullName = new sap.ui.model.Filter("FULL_NM", sap.ui.model.FilterOperator.Contains, sValue);
			var filterSfStfNumber = new sap.ui.model.Filter("SF_STF_NUMBER", sap.ui.model.FilterOperator.Contains, sValue);
			var filterStfNumber = new sap.ui.model.Filter("STAFF_ID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterUluCode = new sap.ui.model.Filter("ULU", sap.ui.model.FilterOperator.Contains, sValue);
			var filterUluText = new sap.ui.model.Filter("ULU_T", sap.ui.model.FilterOperator.Contains, sValue);
			var filterClaimMonth = new sap.ui.model.Filter("CLAIM_MONTH", sap.ui.model.FilterOperator.Contains, sValue);
			var filterClaimYear = new sap.ui.model.Filter("CLAIM_YEAR", sap.ui.model.FilterOperator.Contains, sValue);
			var filterSubmittedByNid = new sap.ui.model.Filter("SUBMITTED_BY_NID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterClaimTypeText = new sap.ui.model.Filter("CLAIM_TYPE_T", sap.ui.model.FilterOperator.Contains, sValue);
			var filterRequestId = new sap.ui.model.Filter("REQUEST_ID", sap.ui.model.FilterOperator.Contains, sValue);
			var filterStatusAlias = new sap.ui.model.Filter("STATUS_ALIAS", sap.ui.model.FilterOperator.Contains, sValue);

			var filtersGrp = new Filter({
				filters: [filterNusNetId, filterFdluCode, filterFdluText, filterFullName,
					filterSfStfNumber, filterStfNumber, filterUluCode,
					filterUluText, filterClaimMonth, filterClaimYear, filterSubmittedByNid, filterClaimTypeText, filterRequestId,
					filterStatusAlias
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
		_handleLocking: function (component, requestStatus, draftId, nusnetId, callBackFx) {
			var serviceUrl;
			if (requestStatus === "LOCK") {
				serviceUrl = Config.dbOperations.requestLock;
			} else {
				serviceUrl = Config.dbOperations.deleteLock;
			}

			serviceUrl = Config.dbOperations.requestLock;
			var requestLockObj = {
				// "NUSNET_ID": component.AppModel.getProperty("/loggedInUserStfNumber"),
				"REQUEST_STATUS": requestStatus,
				"DRAFT_ID": draftId,
				"PROCESS_CODE": component.AppModel.getProperty("/cwsRequest/createCWSRequest/PROCESS_CODE"),
				// "STAFF_ID": component.AppModel.getProperty("/loggedInUserStfNumber"),
				"REQUESTOR_GRP": component.AppModel.getProperty("/userRole")
			};

			Services.getRequestLock(component, requestLockObj, function (lockData) {
				callBackFx(lockData);
				if (component.AppModel.getProperty("/isClaimLocked") && lockData.isError) {
					component.AppModel.setProperty("/isClaimLockedMessage", lockData.message);
				}
				if (component.AppModel.getProperty("/isNavigate")) {
					HeaderHelper._fnCrossAppNavigationToInbox();
				}
				// resolve();
			}.bind(component)
			);

			/*if (requestStatus === "UNLOCK") {
				delete oParameter.REQUEST_STATUS;
			}*/
			// Services._loadDataUsingJsonModel(component, serviceUrl, oParameter, "POST", function (oData) {
			// 	callBackFx(oData);
			// 	var oValue = oData.getSource().getData();
			// 	if (component.AppModel.getProperty("/isClaimLocked") && oValue.error) {
			// 		component.AppModel.setProperty("/isClaimLockedMessage", oValue.message);
			// 	}
			// 	if (component.AppModel.getProperty("/isNavigate")) {
			// 		HeaderHelper._fnCrossAppNavigationToInbox();
			// 	}
			// }.bind(component));

		}
	});
	return requestlockhelper;
}, true);