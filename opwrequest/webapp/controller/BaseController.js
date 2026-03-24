sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator", "../utils/dataformatter", "../utils/services", "sap/ui/core/Fragment", "../utils/utility",
	"../utils/configuration", "sap/m/MessageBox", "../utils/validation"
], function (JSONModel, Controller, Filter,
	FilterOperator, Formatter, Services, Fragment, Utility, Config, MessageBox, Validation) {
	"use strict";

	return Controller.extend("nus.edu.sg.opwrequest.controller.BaseController", {

		getComponentModel: function (modelName) {
			var model = (modelName) ? this.getOwnerComponent().getModel(modelName) : this.getOwnerComponent().getModel();
			return model;
		},
		setComponentModel: function (modelName) {
			if (modelName) {
				this.getOwnerComponent().setModel(new JSONModel(), modelName);
			}
			return this.getOwnerComponent().getModel(modelName);
		},
		handleRefresh: function () {
			this.getOwnerComponent().getInitialDataForUser();
			// window.location.reload(true);
		},
		getI18n: function (sTextField) {
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			var i18nTextValue = oResourceBundle.getText(sTextField);
			return i18nTextValue ? i18nTextValue : sTextField;
		},
		handleLiveChangeTa: function (oEvent) {
			var oTextArea = oEvent.getSource(),
				iValueLength = oTextArea.getValue().length,
				iMaxLength = oTextArea.getMaxLength();
			if (iValueLength > iMaxLength) {
				var oText = oTextArea.getValue().substring(0, iValueLength - (iValueLength - iMaxLength));
				oTextArea.setValue(oText);
			}
		},

		formatUniqueValues: function (data) {

		},

		/**
		 * Check Amount Value
		 */
		checkAmountValue: function (oEvent) {
			var checkObj = {};
			var srcValue = oEvent.getSource().getValue();
			checkObj.srcValue = Formatter.removeSpecialCharsFromAmount(srcValue);
			checkObj.isValid = ((checkObj.srcValue && !isNaN(checkObj.srcValue)) || checkObj.srcValue === "") ? true : false;
			checkObj.isValid = Number(checkObj.srcValue) > 0 ? checkObj.isValid : false;
			return checkObj;
		},
		/**
		 * On Enter Billing Amount
		 */
		onEnterFormatAmount: function (oEvent, key) {
			var updatedVal = 0;
			var checkObj = oEvent.getSource().getValue();
			if (checkObj) {
				updatedVal = checkObj.replace(/\,/g, '');
				updatedVal = Math.round(updatedVal * 100) / 100;
				updatedVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			}
			this.AppModel.setProperty(oEvent.getSource().mBindingInfos.value.parts[0].path, updatedVal);
			this.AppModel.refresh(true);
			if (key === "Payment")
				this.populatePayment(oEvent);
		},
		/**
		 * Handle Routing
		 */
		handleRouting: function (target, navObj) {
			this.oRouter = this.getOwnerComponent().getRouter();
			if (!navObj) {
				navObj = {};
			}
			if (!navObj.layout) {
				navObj.layout = this.getOwnerComponent().getHelper().getNextUIState(1).layout;
			}
			this.oRouter.navTo(target, navObj);
		},
		generateFilter: function (sValueToFilter, aFilterValues, sOperator) {
			sOperator = sOperator || FilterOperator.EQ;
			var aFilterArray = aFilterValues.map(function (sFilterValue) {
				return new sap.ui.model.Filter(sValueToFilter, sOperator, sFilterValue);
			});
			return aFilterArray;
		},
		settingUluFdluValues: function () {
			// var userRole = this.AppModel.getProperty("/userRole");
			var primaryAssigment = this.AppModel.getProperty("/primaryAssigment");
			// var otherAssignments = this.AppModel.getProperty("/otherAssignments");
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/uluPrimary", primaryAssigment.ULU_T);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/fdluPrimary", primaryAssigment.FDLU_T);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/uluPrimaryCode", primaryAssigment.ULU_C);
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/fdluPrimaryCode", primaryAssigment.FDLU_C);
		},
		handleFilter: function () {
			var that = this;
			var sKey = this.getView().byId("itb1").getSelectedKey();
			if (!sKey) {
				sKey = "Draft";
			}
			var aFilters = this._mFilters[sKey];
			var oPayload = {
				"STAFF_NUSNET_ID": this.AppModel.getProperty("/loggedInUserInfo/userName"),
				"REQUEST_STATUS": []
			};
			for (var y = 0; y < aFilters.length; y++) {
				var obj = {};
				obj.REQUEST_STATUS = aFilters[y].oValue1;
				oPayload.REQUEST_STATUS.push(obj);
				//	oPayload.STAFF_NUSNET_ID = "CHELUK";
			}
			Services.fetchFilterData(this, oPayload, function (oResponse) {
				that.AppModel.setProperty("/filterLookupData", oResponse);

			});

		},
		showBusyIndicator: function (milliseconds) {
			var delay = milliseconds || 0;
			sap.ui.core.BusyIndicator.show(delay);
		},

		hideBusyIndicator: function () {
			sap.ui.core.BusyIndicator.hide();
		},

		changeVState: function (oEvent) {
			oEvent.getSource().setValueState("None");
		},

		/*
		 * Display Message in different Sections
		 */
		showMessagePopOver: function (messageElement) {
			messageElement = JSON.parse(JSON.stringify(messageElement));
			var validationResults = [];
			messageElement = (messageElement instanceof Array) ? messageElement : [messageElement];
			for (var i = 0; i < messageElement.length; i++) {
				validationResults.push(messageElement[i]);
			}

			this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", validationResults);
			this.onPressErrorMessages();
			// var showButton = this.getUIControl("cwsErrorMessagesId");
			// showButton.firePress();
		},

		/*
		 * Close Message PopOver
		 */
		closeMessagePopOver: function () {
			//Initialize Message PopOver for the first time
			this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", []);
			// var messageModel = this.modelAssignment("MessagePopOver");
			// if (!Formatter.validateDataInModels(messageModel)) {
			// 	messageModel.setData(this.getOwnerComponent().getModel().getProperty("/messagedata"));
			// }
			// var data = messageModel.getData();
			// data = (data.length > 0) ? [data[0]] : [];
			// messageModel.setData(data);
		},

		/**
		 * Handle Navigation
		 */
		handleNav: function (target) {
			var navCon = this.getUIControl("claimNav");
			if (target) {
				navCon.to(this.getUIControl(target), "slide");
			}
		},
		/**
		 * Model Assignment Function
		 */
		modelAssignment: function (modelName, objAssign) {
			var view = this.getView();
			var model = view.getModel(modelName);
			if (!model) {
				if (objAssign) {
					model = new JSONModel(objAssign);
				} else {
					model = new JSONModel();
				}
				view.setModel(model, modelName);
			}
			return model;
		},
		/**
		 * Get Employee Data
		 */
		getEmployeeData: function (employeeId, userList) {
			var employeeData = {};
			for (var i = 0; i < userList.length; i++) {
				if (employeeId === userList[i].userId) {
					employeeData = userList[i];
					break;
				}
			}
			return employeeData;
		},
		/**
		 * Parse Object
		 */
		parseJsonData: function (data) {
			if (data) {
				data = JSON.parse(JSON.stringify(data));
			}
			return data;
		},
		//Util Operation to Validate Date in the Appn
		checkDate: function (oEvent, srcMsgStrip, fragmentId) {
			srcMsgStrip = (srcMsgStrip) ? srcMsgStrip : (this.selectedIconTab === "Contract") ? "contractMsgStrip" : (this.selectedIconTab ===
				"Terminate") ? "terminateMsgStrip" : (this.selectedIconTab === "Ship Change") ? "shipMsgStrip" : "recruitMsgStrip";
			this.closeMessageStrip(srcMsgStrip);
			if (!(Formatter.validateEnteredDate(oEvent.getParameter("id"), oEvent.getParameter("valid")))) {
				this.showMessageStrip(srcMsgStrip, "Please select current or future date", "E", fragmentId);
			}
		},

		formatDate: function (date) {
			if (date) {
				var year = date.toLocaleString('default', {
					year: 'numeric'
				});
				var month = date.toLocaleString('default', {
					month: '2-digit'
				});
				var day = date.toLocaleString('default', {
					day: '2-digit'
				});
				return [year, month, day].join('-');
			} else {
				return "";
			}
		},

		fnPaymentAmount: function (key, model, filter) {
			var oDeptRole = this.AppModel.getProperty("/isDeptOHRSS");
			var paymentListObj = {
				"REQ_UNIQUE_ID": this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID"),
				"REQUEST_ID": this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_ID"),
				"ROLE": (oDeptRole === true) ? this.getI18n("CwsRequest.OHRSS") : this.AppModel.getProperty("/userRole"),
				"START_DATE": this.formatDate(this.AppModel.getProperty("/cwsRequest/createCWSRequest/START_DATE")),
				"END_DATE": this.formatDate(this.AppModel.getProperty("/cwsRequest/createCWSRequest/END_DATE")),
				"AMOUNT": this.AppModel.getProperty("/cwsRequest/createCWSRequest/AMOUNT"),
				// "NOOFMONTHS": parseInt(this.AppModel.getProperty("/Month")),
				"STAFF_ID": this.AppModel.getProperty("/cwsRequest/createCWSRequest/STAFF_ID")
			};

			Services.getPaymentList(this, paymentListObj, function (paymentData) {
				this._fnpopulatePayments(paymentData, key);
				// resolve();
			}.bind(this)
			);

			// var sUrl = Config.dbOperations.oPaymentList;
			// var oHeaders = Formatter._amendHeaderToken(this);
			// var paymentModel = new JSONModel();
			// paymentModel.loadData(sUrl, JSON.stringify(paymentListHeader), null, "POST", null,
			// 	null, oHeaders);
			// paymentModel.attachRequestCompleted(function (oResponse) {
			// 	this._fnpopulatePayments(oResponse.getSource().getData(), key);
			// }.bind(this));
		},

		_fnpopulatePayments: function (data, key) {
			// this.AppModel.setProperty("/isEditAllowed", data.editAllowed);
			if (data && Object.keys(data).length > 0) {

				this.AppModel.setProperty("/isEditAllowed", data.isEditAllowed);
				this.AppModel.setProperty("/isadminDetailsEditAllowed", data.adminDetailsEditAllowed);
				this.AppModel.setProperty("/isWbsChangeAllowed", data.wbsChangeAllowed);
				this.AppModel.setProperty("/derivePropUsage", data.derivePropUsage);
				if (this.viaRequestorForm && this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQUEST_STATUS") === "38" && !this.AppModel.getProperty(
					"/isEditAllowed")) {
					this.AppModel.setProperty("/exitFullScreen", false);
					this.AppModel.setProperty("/showWithdrawButton", false);
					this.AppModel.setProperty("/showEditButtonApproved", false);
					this.AppModel.setProperty("/isFormEditable", false);
				}

				this.AppModel.setProperty("/oPaymentDatatable", false);
				this.AppModel.setProperty("/PaidStartDate", true);
				if (data.statusCode === "E") {
					if (key === "N") {
						this.showMessageStrip("cwsRequestDialogMStripId", data.message, "E", "NewRequestTypeSelectionDialog");
					} else {
						var aValidation = [];
						aValidation.push(Validation._formatMessageList("Error", "Payment Error", data.message));
						this.AppModel.setProperty("/cwsRequest/paymentError", aValidation);
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/singleRequestErrorMessages", aValidation);
						this.AppModel.setProperty("/oPaymentDatatable", true);
						// var uniqueYears = Array.from(new Set((data.paymentList).map(item => item.YEAR)));
						// var oUniqueModelData = uniqueYears.map(function (value) {
						// 	return {
						// 		YEAR: value
						// 	};
						// });
						if (data.paymentList && data.paymentList.length > 0) {
							var uniqueYears = Array.from(new Set(data.paymentList.map(item => item.YEAR)));
							var oUniqueModelData = uniqueYears.map(value => ({ YEAR: value }));
							this.AppModel.setProperty("/paymentYearList", oUniqueModelData);
						}
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/paymentList", data.paymentList);
						this.onPressErrorMessages();
					}
				} else {
					if (key === "N") {
						this._fncreateLoad();
					}
					var cwRequestData = this.AppModel.getProperty("/cwsRequest/createCWSRequest");
					delete data.START_DATE;
					delete data.END_DATE;
					delete data.REQ_UNIQUE_ID;
					delete data.REQUEST_ID;
					var uniqueYears = Array.from(new Set((data.paymentList).map(item => item.YEAR)));
					var oUniqueModelData = uniqueYears.map(function (value) {
						return {
							YEAR: value
						};
					});
					this.AppModel.setProperty("/paymentYearList", oUniqueModelData);

					if (data.paymentList.length > 0) {
						var status = data.paymentList.find(function (element) {
							return element.PAYMENT_REQ_STATUS === "54";
						}.bind(this));
						if (cwRequestData.REQUEST_STATUS === "38")
							this.AppModel.setProperty("/PaidStartDate", !status);
					}

					Object.assign(cwRequestData, data);
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/", cwRequestData);
					this.AppModel.setProperty("/cwsRequest/paymentError", []);
					if (this.getView().byId("oTableWbs")) {
						this.onListItemPress();
					}
				}

				// Manage Levy Details and display
				this.fnLevyCalculation();
			}
		},

		// Levy display and calculation

		// !this.AppModel.getProperty("/cwsRequest/createCWSRequest/PROPERTY_USAGE")  &&
		fnLevyCalculation: function () {
			var oData = this.AppModel.getProperty("/levyList");

			if (this.viaRequestorForm) {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/PROPERTY_USAGE", this.AppModel.getProperty("/derivePropUsage"));
			}

			//Manage Retrieval Operation
			var propertyUsage = this.AppModel.getProperty("/cwsRequest/createCWSRequest/PROPERTY_USAGE");
			if (propertyUsage) {
				this.AppModel.setProperty("/cwsRequest/createCWSRequest/LEVY_PERCENT", "");
				jQuery.sap.each(oData, function (i, element) {
					if (propertyUsage === element.CONFIG_KEY) {
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/LEVY_PERCENT", parseFloat(element.REFERENCE_VALUE));
					}
				}.bind(this));
			}

		},

		onListItemPress: function (oEvent) {
			var oValue;
			if (oEvent) {
				oValue = oEvent.getSource().getTitle();
			} else {
				// oValue = new Date().getFullYear();
				oValue = this.AppModel.getProperty("/paymentYearList")[0].YEAR;
			}
			var filters = [];
			var sFilter;
			if (oValue) {
				sFilter = new sap.ui.model.Filter("YEAR", sap.ui.model.FilterOperator.EQ, oValue);
			}

			filters.push(sFilter);
			var list = this.getView().byId("oTableWbs");
			var binding = list.getBinding("items");
			binding.filter(filters);
		},

		_fnClearAppModel: function () {
			Utility._fnAppModelSetProperty(this, "/attachmentList", []);
			Utility._fnAppModelSetProperty(this, "/showSearchField", false);
			Utility._fnAppModelSetProperty(this, "/rejectionRemarks", "");
			Utility._fnAppModelSetProperty(this, "/postRemarks", "");
			Utility._fnAppModelSetProperty(this, "/requiredUiControl", {
				"ClaimTypeDialog": {
					"claimType": true,
					"selectMonth": true,
					"staffId": false,
					"ulu": true,
					"fdlu": true,
					"claimRequestType": false
				},
				"ClaimDetailView": {
					"startTime": false,
					"endTime": false,
					"hoursUnit": false,
					"rateType": false,
					"rateAmount": false,
					"isDiscrepancy": false,
					"amountDiscrepancy": false,
					"totalAmount": false,
					"wbs": false,
					"remarks": false
				}
			});
			Utility._fnAppModelSetProperty(this, "/isClaimLocked", false);
			Utility._fnAppModelSetProperty(this, "/isClaimLockedMessage", true);
			Utility._fnAppModelSetProperty(this, "/disclaimerConfirmChecked", false);
			//			Utility._fnAppModelSetProperty(this, "/claimAuthorizations", []);
			Utility._fnAppModelSetProperty(this, "/sClaimaintListUluFdlu", "");
			Utility._fnAppModelSetProperty(this, "/iconTabBarSelectedKey", "Draft");
			Utility._fnAppModelSetProperty(this, "/showSaveButton", false);
			Utility._fnAppModelSetProperty(this, "/showSubmitButton", false);
			Utility._fnAppModelSetProperty(this, "/showWithdrawButton", false);
			Utility._fnAppModelSetProperty(this, "/showRetractButton", false);
			Utility._fnAppModelSetProperty(this, "/showCheckButton", false);
			Utility._fnAppModelSetProperty(this, "/showRejectButton", false);
			Utility._fnAppModelSetProperty(this, "/showVerifyButton", false);
			Utility._fnAppModelSetProperty(this, "/showApproveButton", false);
			Utility._fnAppModelSetProperty(this, "/showAdditonalApprover2", false);
			Utility._fnAppModelSetProperty(this, "/showAdditionalApproverLink", true);
			Utility._fnAppModelSetProperty(this, "/showRemoveAdditionalApproverLink", false);
			Utility._fnAppModelSetProperty(this, "/exitFullScreen", true);
			Utility._fnAppModelSetProperty(this, "/closeColumn", true);
			Utility._fnAppModelSetProperty(this, "/isFlpBackButtonPressed", "");
			Utility._fnAppModelSetProperty(this, "/processFlowRequestID", "");
			Utility._fnAppModelSetProperty(this, "/processNode", {
				"nodes": [],
				"lanes": []
			});
			Utility._fnAppModelSetProperty(this, "/errorMessage", []);
			Utility._fnAppModelSetProperty(this, "/errorMessages", {
				"valueState": {
					"ClaimTypeDialog": {
						//"claimTypeDialogStaffId" : false
						// "proceedButton" : false,
						// "massuploadButton" : false
					},
					"ClaimDetailView": {
						"wbs": false
						// "Date" : true,
						// "StartDate" : false,
						// "EndDate" : false,
						// "SelectDates" : false
					},
					"SelectPlanningDateFromCalendar": {
						"wbs": false
					}
				},
				"valueStateText": {
					"ClaimTypeDialog": {
						//"claimTypeDialogStaffId" : false
						// "proceedButton" : false,
						// "massuploadButton" : false
					},
					"ClaimDetailView": {
						// "Date" : true,
						// "StartDate" : false,
						// "EndDate" : false,
						// "SelectDates" : false
						"wbs": false
					},
					"SelectPlanningDateFromCalendar": {
						"wbs": false
					}
				}
			});
			Utility._fnAppModelSetProperty(this, "/enable", {
				"ClaimTypeDialog": {

				},
				"ClaimDetailView": {
					"ROW_ACTIONS": true,
					"ROW_ADD": true,
					"ROW_DELETE": true,
					"CLAIM_START_DATE": true,
					"CLAIM_END_DATE": true,
					"CLAIM_DAY_TYPE": true,
					"START_TIME": true,
					"END_TIME": true,
					"HOURS_UNIT": true,
					"RATE_TYPE": true,
					"RATE_TYPE_AMOUNT": true,
					"IS_DISCREPENCY": true,
					"DISC_RATETYPE_AMOUNT": true,
					"WBS": true,
					"REMARKS": true,
					"VERIFIER_SRCH_HELP": false,
					"ADD_1_SRCH_HELP": false,
					"ADD_2_SRCH_HELP": false,
					"ATTACHMENT_UPLOAD": false,
					"HEADER_REMARKS": true
				}
			});
			Utility._fnAppModelSetProperty(this, "/visibility", {
				"ClaimTypeDialog": {
					"claimTypeDialogStaffId": false
					// "proceedButton" : false,
					// "massuploadButton" : false
				},
				"ClaimDetailView": {
					"Date": true,
					"StartDate": false,
					"EndDate": false,
					"StartTime": true,
					"EndTime": true,
					"SelectDates": false,
					"UluFdluSelection": false
				}
			});

		},
		/**
		 * Confirmation to submit
		 */
		confirmOnActionSubmit: function (message, messageState, submissionCallBack) {
			var dialogContent = [];
			// Add your FormattedText message
			dialogContent.push(
				new sap.m.FormattedText({
					htmlText: message
				})
			);

			// var weekendCheck = Services.validateForWeekend(this);
			Services.validateForWeekend(this, function (weekendData) {
				if (weekendData && weekendData.showMessage && weekendData.message) {
					// Add vertical space using an HBox with fixed height
					dialogContent.push(
						new sap.m.HBox({
							height: "20px", // Or any height you prefer
							items: [] // No items, pure spacing
						})
					);

					dialogContent.push(
						new sap.m.MessageStrip({
							text: weekendData.message,
							type: "Warning",
							showIcon: true,
							showCloseButton: false
						})
					);
				}

				var dialog = new sap.m.Dialog({
					title: "Confirmation",
					state: (messageState === "I") ? "Information" : "Warning",
					type: "Message",
					content: dialogContent,
					beginButton: new sap.m.Button({
						text: "Yes",
						press: function () {
							dialog.close();
							submissionCallBack();
						}
					}),
					endButton: new sap.m.Button({
						text: 'No',
						press: function () {
							dialog.close();
						}
					}),
					afterClose: function () {
						dialog.destroy();
					}
				});
				dialog.open();
			}.bind(this)
			);
		},
		/**
		 * Confirmation On Action
		 */
		confirmOnAction: function (message, messageState, submissionCallBack) {
			var dialog = new sap.m.Dialog({
				title: "Confirmation",
				state: (messageState === "I") ? "Information" : "Warning",
				type: "Message",
				content: new sap.m.Text({
					text: message
				}),
				beginButton: new sap.m.Button({
					text: "Yes",
					press: function () {
						dialog.close();
						submissionCallBack();
					}
				}),
				endButton: new sap.m.Button({
					text: 'No',
					press: function () {
						dialog.close();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});
			dialog.open();
		},
		/*
		 * Show Message Strip
		 */
		showMessageStrip: function (stripId, message, mType, fragmentId) {
			var mStrip = this.getUIControl(stripId, fragmentId);
			mStrip.setText(message);
			mStrip.setType((mType === "E") ? "Error" : "None");
			mStrip.setVisible(true);
		},
		/**
		 * Show Message List in a Dialog 
		 */
		showMassUploadErrorDialog: function (errorMessageList) {
			if (this.errorDialog) {
				this.errorDialog.destroy(true);
			}
			this.errorDialog = sap.ui.xmlfragment(
				"com.stengglink.billingrequest.view.fragments.display.MassUploadErrorDialog", this);
			this.getView().addDependent(this.errorDialog);
			this.modelAssignment("ErrorMessageModel").setData(errorMessageList);
			// this.errorDialog.setModel(new JSONModel({
			// 	"errorList": errorMessageList
			// }));
			this.errorDialog.open();
		},
		closeMassErrorDialog: function () {
			if (this.errorDialog) {
				this.errorDialog.destroy(true);
			}
		},
		/**
		 * Show Mass Upload Confirmation 
		 */
		showAcknowledgementDialog: function (ackData) {
			if (this.ackDialog) {
				this.ackDialog.destroy(true);
			}
			this.ackDialog = sap.ui.xmlfragment("com.stengglink.billingrequest.view.fragments.display.AcknowledgementDialog", this);
			this.getView().addDependent(this.ackDialog);
			this.ackDialog.setModel(new JSONModel(ackData));
			this.ackDialog.open();
		},
		/**
		 * Close Mass upload Confirmation Dialog
		 */
		closeAcknowledgementDialog: function () {
			if (this.ackDialog) {
				this.ackDialog.destroy(true);
			}
		},
		/**
		 * Close Message Strip
		 */
		closeMessageStrip: function (stripIds, fragmentId) {
			stripIds = (stripIds.indexOf(",") > -1) ? stripIds.split(",") : [stripIds];
			var control;
			var that = this;
			jQuery.sap.each(stripIds, function (s) {
				control = that.getUIControl(stripIds[s], fragmentId);
				if (control) {
					control.setVisible(false);
				}
			});
		},
		/*
		 * Set Busy Indicators
		 */
		loadBusyIndicator: function (content, isBusy) {
			var pageContent = this.getView().byId(content);
			pageContent = (pageContent) ? pageContent : sap.ui.getCore().byId(content);
			pageContent.setBusy(isBusy);
		},
		/**
		 * Fetch control
		 */
		getUIControl: function (id, fragmentId) {
			var view = this.getView();
			var control = (fragmentId) ? Fragment.byId(fragmentId, id) : (view.byId(id)) ? view.byId(id) : sap.ui.getCore().byId(id);
			return control;
		},
		formatAmount: function (val) {
			return Formatter.formatRequestAmount(val);
			// if (val) {
			// 	val = Number(val);
			// 	val = val.toFixed(2);
			// 	return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			// } else {
			// 	return 0.00;
			// }
		},

		formatAmn: function (oEvent) {
			var oNumber = oEvent.getSource().getValue();

			if (oNumber) {
				oNumber = parseFloat(oNumber).toFixed(2);
				oEvent.getSource().setValue(oNumber);
			} else {
				oEvent.getSource().setValue();
			}

		},
		wbsElementsLookUp: function (oEvent) {
			var token = this.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token
			};
			var url = "/eclaims/rest/fetchWBS?staffId=12564";
			var wbsElementTypeModel = new JSONModel();
			wbsElementTypeModel.loadData(url, null, false, "GET", null, null, oHeaders);
			this.AppModel.setProperty("/cwsRequest/wbsElementsList", wbsElementTypeModel.getProperty("/"));
		},

		/**
		 * Lookup Value Help
		 */
		lookupValueHelp: function (oEvent) {
			var src = oEvent.getSource();
			var bindingControl = oEvent.getSource().getBindingInfo("value").parts[0].path;
			var urlPath = src.getUrlAttr();
			// var sServiceUrl = Config.dbOperations.metadataClaims + urlPath;

			var bindingPath = (oEvent.getSource().getBindingContext("AppModel")) ? oEvent.getSource().getBindingContext("AppModel").getPath() :
				"";
			src.setUrlPath(urlPath);
			var modelData = null;
			var lookupFilter = this.manageServiceUrlToInvoke(bindingControl);
			var isAsync = Boolean(bindingControl === "/cwsRequest/createCWSRequest/FULL_NM");
			// src.setUrlPath(sServiceUrl);
			// var oHeaders = Formatter._amendHeaderToken(this);
			var oCatalogSrvModel = this.getComponentModel("CatalogSrvModel");
			// src.openValueHelp(oEvent, null, isAsync, modelData, true, oHeaders, function (selectedObj) {
			// 	this.setValuesFromLookup(bindingControl, bindingPath, selectedObj);
			// }.bind(this));

			src.openValueHelp(oEvent, null, oCatalogSrvModel, lookupFilter, false, modelData, true, function (selectedObj) {
				this.setValuesFromLookup(bindingControl, bindingPath, selectedObj);
			}.bind(this));
		},
		manageServiceUrlToInvoke: function (bindingControl) {
			// Manage Selection for Faculty and Department
			// var selectedFaculty = this.AppModel.getProperty("/cwsRequest/createCWSRequest/FACULTY_C");
			var lookupFilter = [];
			var selectedUlu = this.AppModel.getProperty("/cwsRequest/createCWSRequest/ULU");
			if (bindingControl === "/cwsRequest/createCWSRequest/FDLU_T" && selectedUlu) {
				// sServiceUrl += "&$filter=ULU_C eq '" + selectedUlu + "'";
				lookupFilter.push(new Filter("ULU_C", FilterOperator.EQ, selectedUlu));
			}

			// Manage Selection for Staff by Department Admin
			if (bindingControl === "/cwsRequest/createCWSRequest/FULL_NM") {
				var appMatrixAuth = this.AppModel.getProperty("/appMatrixAuth");
				var appMatrixUrl = "";
				var staffFilter = [];
				jQuery.sap.each(appMatrixAuth, function (i, appElement) {
					// if (appElement.STAFF_USER_GRP === this.getI18n("CwsRequest.User.DeptAdminAlias")) {
					// 	appMatrixUrl += (!appMatrixUrl) ? "&$filter=" : "";
					// 	var key = appMatrixAuth.length === i + 1 ? "" : " or ";
					// 	appMatrixUrl += "ULU_C eq '" + appElement.ULU_C + "' and FDLU_C eq '" + appElement.FDLU_C + "'" + key;
					// }
					staffFilter.push(new Filter("ULU_C", FilterOperator.EQ, appElement.ULU_C));
					staffFilter.push(new Filter("FDLU_C", FilterOperator.EQ, appElement.FDLU_C));

				}.bind(this));
				lookupFilter.push(new Filter(staffFilter, false));


				// var lastOrIndex = appMatrixUrl.lastIndexOf("or");
				// if (lastOrIndex !== -1) {
				// 	appMatrixUrl = appMatrixUrl.substring(0, lastOrIndex);
				// }
				// sServiceUrl += appMatrixUrl;
			}
			return lookupFilter;
		},

		onValueHelpRequest: function () {
			this.AppModel.setProperty("/staffList", []);
			var oView = this.getView();
			if (!this._oDialogAddStaff) {
				this._oDialogAddStaff = Fragment.load({
					id: oView.getId(),
					name: "nus.edu.sg.opwrequest.view.fragments.StaffValueHelpDialog",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					return oDialog;
				});
			}

			this._oDialogAddStaff.then(function (oDialog) {
				oDialog.open();
			});
		},

		handleConfirmStaff: function (oEvent) {
			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				for (var i = 0; i < aContexts.length; i++) {
					var sPath = aContexts[i].getPath();
					var selectedObj = this.AppModel.getProperty(sPath);
					selectedObj.STF_NUMBER = selectedObj.STF_NUMBER.replace("(" + selectedObj.NUSNET_ID + ")", "").trim();
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/STAFF_ID", selectedObj.STF_NUMBER);
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/FULL_NM", selectedObj.FULL_NM);
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/STAFF_NUSNET_ID", selectedObj.NUSNET_ID);
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/CONCURRENT_STAFF_ID", selectedObj.SF_STF_NUMBER);

					this.AppModel.setProperty("/cwsRequest/createCWSRequest/START_DATE", null);
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/END_DATE", null);
					if (selectedObj.LEAVING_DATE) {
						var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
							pattern: "d MMM, yyyy"
						});
						var eodDate = oDateFormat.format(new Date(selectedObj.LEAVING_DATE));
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/LEAVING_DATE", eodDate);
					} else {
						this.AppModel.setProperty("/cwsRequest/createCWSRequest/LEAVING_DATE", null);
					}
				}
			}
		},
		/**
		 * @param oEvent
		 * Search Staff Function in the Lookup
		 * 
		 * Enhancement added for allowing Retired (R) and Reported No Show (RNS) Employee Status
		 * staff for OPWN submission as on 28 May, 2024
		 * Also performed some clean up on Filter and FilterOperator usage. Directly using the reference
		 */
		handleSearchStaffs: function (oEvent) {
			this.showBusyIndicator();
			var sValue = oEvent.getParameter("value").toString();
			var filterStaffId = new Filter("SF_STF_NUMBER", FilterOperator.EQ, sValue);
			var filterEXT = new Filter("IS_EXTERNAL", FilterOperator.EQ, 0);

			var orFilter = new Filter({
				filters: [new Filter("EMPL_STS_C", FilterOperator.EQ, "A"),
				new Filter("EMPL_STS_C", FilterOperator.EQ, "U"),
				new Filter("EMPL_STS_C", FilterOperator.EQ, "P"),
				new Filter("EMPL_STS_C", FilterOperator.EQ, "T"),
				new Filter("EMPL_STS_C", FilterOperator.EQ, "R"),
				new Filter("EMPL_STS_C", FilterOperator.EQ, "RNS")
				],
				and: false
			});

			var aFilters = new Filter({
				filters: [filterStaffId, filterEXT, orFilter],
				and: true
			});
			if (!sValue) {
				this.AppModel.setProperty("/staffList", []);
				this.hideBusyIndicator();
			} else {
				var oCatalogSrvModel = this.getComponentModel("CatalogSrvModel");
				oCatalogSrvModel.read(Config.dbOperations.userLookup, {
					urlParameters: {
						"$select": "NUSNET_ID,FULL_NM,STF_NUMBER,IS_EXTERNAL,SF_STF_NUMBER,LEAVING_DATE"
					},
					filters: [aFilters],
					success: function (oData) {
						if (oData.results.length) {
							this.AppModel.setProperty("/staffList", oData.results);
						} else {
							this.AppModel.setProperty("/staffList", []);
						}
						this.hideBusyIndicator();
					}.bind(this),
					error: function (oError) {
						this.hideBusyIndicator();
					}
				});
			}
		},


		onNavDashBoard: function () {
			if (sap.ushell && sap.ushell.Container) {
				sap.ushell.Container.getServiceAsync("Navigation")
					.then(function (oNavigation) {
						oNavigation.navigate({
							target: {
								semanticObject: "cwdashboard",
								action: "Display"
							},
							params: {}
						});
					})
					.catch(function (err) {
						MessageBox.error("Dashboard App Navigation failed: " + err.message);
					});
			} else {
				MessageBox.error("Navigation service is not available.");
			}
		},

		showDialogWithTimer: function () {
			var remainingTime = 10;
			var that = this;
			var oDialog = new sap.m.Dialog({
				title: "Warning",
				type: sap.m.DialogType.Message,
				state: "Warning",
				content: [
					new sap.m.Text({
						text: "An Interim issue has occurred, the screen will be navigated to main page in " + remainingTime + " seconds"
					})
				],
				beginButton: new sap.m.Button({
					text: "OK",
					type: "Emphasized",
					press: function () {
						oDialog.close();
						that.onNavDashBoard();
					}.bind(this)
				})
			});
			oDialog.open();

			// Update the remaining time every second
			var timer = setInterval(function () {
				remainingTime--;
				oDialog.getContent()[0].setText("An Interim issue has occurred, the screen will be navigated to main page in " + remainingTime +
					" seconds");
				if (remainingTime <= 0) {
					clearInterval(timer);
					oDialog.close();
					that.onNavDashBoard();
				}
			}, 1000);
		},

		/**
		 * Set Values From Lookup
		 */
		setValuesFromLookup: function (bindingControl, bindingPath, selectedObj) {
			var appModel = this.AppModel;
			switch (bindingControl) {
				/*	case "/cwsRequest/createCWSRequest/FACULTY_T":
						appModel.setProperty("/cwsRequest/createCWSRequest/FACULTY_C", selectedObj.ULU_C);
						appModel.setProperty("/cwsRequest/createCWSRequest/FACULTY_T", selectedObj.ULU_T);
						appModel.setProperty("/cwsRequest/createCWSRequest/DEPT_C", "");
						appModel.setProperty("/cwsRequest/createCWSRequest/DEPT_T", "");
						appModel.setProperty("/isFdluEnabled", true);
						break;*/
				case "/cwsRequest/createCWSRequest/ULU_T":
					appModel.setProperty("/cwsRequest/createCWSRequest/ULU", selectedObj.ULU_C);
					appModel.setProperty("/cwsRequest/createCWSRequest/ULU_T", selectedObj.ULU_T);
					appModel.setProperty("/cwsRequest/createCWSRequest/FDLU", "");
					appModel.setProperty("/cwsRequest/createCWSRequest/FDLU_T", "");
					// Begin of change - Change Program Manager when ULU changed
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/SELECTED_PROGRAM_MGR", []);
					this._bindItemProgramManager();
					// End of change - change Program Manager
					break;
				case "/cwsRequest/createCWSRequest/FDLU_T":
					appModel.setProperty("/cwsRequest/createCWSRequest/FDLU", selectedObj.FDLU_C);
					appModel.setProperty("/cwsRequest/createCWSRequest/FDLU_T", selectedObj.FDLU_T);
					// Begin of change - Change Program Manager when FDLU changed
					this.AppModel.setProperty("/cwsRequest/createCWSRequest/SELECTED_PROGRAM_MGR", []);
					this._bindItemProgramManager();
					// End of change - change Program Manager
					break;
				case "CURRENCY":
					appModel.setProperty(bindingPath + "/BIZ_EXP_CRNCY", selectedObj.CONFIG_KEY);
					break;
				case "BIZ_EXP_CRNCY":
					appModel.setProperty(bindingPath + "/CURRENCY", selectedObj.CONFIG_KEY);
					break;
				case "STAFF_ULU_T":
					appModel.setProperty(bindingPath + "/STAFF_ULU", selectedObj.ULU_C);
					appModel.setProperty(bindingPath + "/STAFF_ULU_T", selectedObj.ULU_T);
					appModel.setProperty(bindingPath + "/STAFF_FDLU", "");
					appModel.setProperty(bindingPath + "/STAFF_FDLU_T", "");
					appModel.setProperty(bindingPath + "/isFdluEnabled", true);
					break;
				case "STAFF_FDLU_T":
					appModel.setProperty(bindingPath + "/STAFF_FDLU", selectedObj.FDLU_C);
					appModel.setProperty(bindingPath + "/STAFF_FDLU_T", selectedObj.FDLU_T);
					break;
				case "/cwsRequest/createCWSRequest/FULL_NM":
					selectedObj.STF_NUMBER = selectedObj.STF_NUMBER.replace("(" + selectedObj.NUSNET_ID + ")", "").trim();
					appModel.setProperty("/cwsRequest/createCWSRequest/STAFF_ID", selectedObj.STF_NUMBER);
					appModel.setProperty("/cwsRequest/createCWSRequest/FULL_NM", selectedObj.FULL_NM);
					appModel.setProperty("/cwsRequest/createCWSRequest/STAFF_NUSNET_ID", selectedObj.NUSNET_ID);
					break;
				default:
					break;
			}
		},

		handleErrorDialog: function (e) {
			var oMessage;
			try {
				var oMsg = JSON.parse(e).message;
				var startIndex = oMsg.indexOf('{');
				var endIndex = oMsg.lastIndexOf('}') + 1;
				var jsonStr = oMsg.slice(startIndex, endIndex);
				var ojson = JSON.parse(jsonStr);
				oMessage = ojson.error;
			} catch (er) {
				try {
					var json = JSON.parse(response.responseText);
					oMessage = JSON.parse(json.message);
				} catch (er) {
					oMessage = "Error Occurred";
				}
			}
			MessageBox.error(oMessage);
		},

		// Deletion for request

		onPressDeleteDraft: function (oEvent) {
			var reqUniqueId;
			if (oEvent === "D") {
				var reqUniqueId = this.AppModel.getProperty("/cwsRequest/createCWSRequest/REQ_UNIQUE_ID");
			} else {
				var sPath = oEvent.getSource().getBindingContext("CwsSrvModel").getPath();
				reqUniqueId = oEvent.getSource().getModel("CwsSrvModel").getProperty(sPath + "/REQ_UNIQUE_ID");
			}
			MessageBox.confirm(
				"Please confirm to delete ?", {
				icon: "sap-icon://question-mark",
				title: "Confirmation",
				actions: [sap.m.MessageBox.Action.DELETE, sap.m.MessageBox.Action.CANCEL],
				emphasizedAction: MessageBox.Action.DELETE,
				onClose: function (oAction) {
					if (oAction === sap.m.MessageBox.Action.DELETE) {
						var aParameter = {
							"inputList": []
						};

						aParameter.inputList.push({
							"DRAFT_ID": reqUniqueId
						});
						Services.performDraftDeletion(this, aParameter, function (utilisationData) {
							if (!oData.getSource().getData().error) {
								if (oEvent !== "D") {
									MessageBox.success("Request has been deleted successfully.");
								} else {
									Utility._fnSuccessDialog(this, oData.getSource().getData().message, function () {
										this._fnClearLocal();
										this.oRouter.navTo("master", {
											layout: "OneColumn"
										}, true);
									}.bind(this));
								}
								this.getOpwnRequests();
								// this._fnReadAfterMetadataLoaded(this.getOwnerComponent().getModel("CwsSrvModel"));
							} else {
								MessageBox.error(oData.getSource().getData().message);
							}
						}.bind(this)
						);
						// Services._loadDataUsingJsonModel(this, Config.dbOperations.deleteReqUrl, aParameter, "POST", function (oData) {
						// 	if (!oData.getSource().getData().error) {
						// 		if (oEvent !== "D") {
						// 			MessageBox.success("Request has been deleted successfully.");
						// 		} else {
						// 			Utility._fnSuccessDialog(this, oData.getSource().getData().message, function () {
						// 				this._fnClearLocal();
						// 				this.oRouter.navTo("master", {
						// 					layout: "OneColumn"
						// 				}, true);
						// 			}.bind(this));
						// 		}
						// 		this._fnReadAfterMetadataLoaded(this.getOwnerComponent().getModel("CwsSrvModel"));
						// 	} else {
						// 		MessageBox.error(oData.getSource().getData().message);
						// 	}
						// }.bind(this));
					}
				}.bind(this)
			}
			);
		},

		_fnClearLocal: function () {
			var myValue = localStorage.getItem("New_DraftID");
			if (myValue) {
				localStorage.removeItem("New_DraftID");
				localStorage.clear();
			}
		}

	});
}, true);