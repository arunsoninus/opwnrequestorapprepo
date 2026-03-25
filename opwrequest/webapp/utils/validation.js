sap.ui.define([
		"./configuration", "./dataformatter",
		"./utility", "sap/ui/core/library"
	], function (Config, Formatter, Utility, coreLibrary) {
		"use strict";
		var ValueState = coreLibrary.ValueState;
		var validation = ("nus.edu.sg.opwrequest.utils.validation", {

			initializeAllValueStates: function (component) {
				component.AppModel.setProperty("/cwsRequest/validationRequest", {});
			},

			/**
			 * On Enter Duration
			 */
			validateDatesNDuration: function (component) {
				var startDate = component.AppModel.getProperty("/cwsRequest/createCWSRequest/START_DATE");
				var endDate = component.AppModel.getProperty("/cwsRequest/createCWSRequest/END_DATE");
				var durationDays = component.AppModel.getProperty("/cwsRequest/createCWSRequest/DURATION_DAYS");
				var message = "";
				startDate = (startDate) ? startDate.setHours(0, 0, 0, 0) : null;
				endDate = (endDate) ? endDate.setHours(0, 0, 0, 0) : null;
				//Validate Start and End Date
				var diffDays;
				if (startDate && endDate) {
					diffDays = Formatter.getDaysDiff(startDate, endDate);

					message = (diffDays < 0) ? "Start date must be before the end date." : "";

					if (durationDays && !message) {
						diffDays = (diffDays == 0) ? 1 : diffDays + 1;
						message = (diffDays < Number(durationDays)) ?
							"Duration entered (" + durationDays +
							") is greater than the date range.\n Please select valid range or provide correct duration" :
							"";
					}
				}
				return message;
			},

			/**
			 * Validate a Request Upon Submission
			 */
			validateCwsRequest: function (component) {
				var data = component.AppModel.getProperty("/cwsRequest/createCWSRequest");
				var validationElement = {};
				var validateResponse = {
					"messageList": []
				};

				if (validateResponse.messageList.length === 0) {
					this.validateBasicInfoNDuration(data, validationElement, validateResponse.messageList, component);
					this.validateDuration(data.durationSplitList, validationElement, validateResponse.messageList, component);
					this.validateClientWorkDetails(data, validationElement, validateResponse.messageList, component);
					// this.validateAttachmentList(data.attachmentList, "CwsRequest.Attachmnent.Message", validateResponse.messageList, component);
					this.validateCostDistribution(data.wbsList, validationElement, validateResponse.messageList, component);
					this.validateCostDistributionPerc(data.wbsList, validationElement, validateResponse.messageList, component);
					this.validateSelectedProgramManager(data.SELECTED_PROGRAM_MGR, data.STAFF_ID, validationElement, validateResponse.messageList,
						component);
				}
				validateResponse.isValid = (validateResponse.messageList.length > 0) ? false : true;
				component.AppModel.setProperty("/cwsRequest/validationRequest", validationElement);
				return validateResponse;
			},

			validateDuration: function (data, validationElement, messageList, component) {
				var messageElement = {
					"type": "Error",
					"sTitle": "Duration Error",
					"active": false,
					"counter": 0
				};
				var sumofAbove = 0;
				var durationDays = component.AppModel.getProperty("/cwsRequest/createCWSRequest/DURATION_DAYS");
				if (!durationDays || (durationDays && (parseFloat(durationDays) > 0.00 ||
						parseFloat(durationDays) > 0))) {
					for (var i = 0; i < data.length; i++) {
						sumofAbove += Number(data[i].DURATION);
					}
					if (parseFloat(sumofAbove) !== parseFloat(durationDays)) {
						component.AppModel.setProperty("/durationState", "Error");
						validationElement.durationVState = "Error";
						messageElement.message = component.getI18n("CwsRequest.basicinfo.Duration");
						messageList.push(messageElement);
					} else {
						component.AppModel.setProperty("/durationState", "None");
						validationElement.durationVState = "None";
					}
				}

			},

			/**
			 * Validate Upon Update Receivables
			 */
			validateUpdateReceivables: function (component) {
				var data = component.AppModel.getProperty("/cwsRequest/createCWSRequest");
				var validationElement = {};
				var validateResponse = {
					"messageList": []
				};
				if (validateResponse.messageList.length === 0) {
					this.validatePaymentDetails(data.receivedPaymentList, validationElement, validateResponse.messageList, component);
					this.validateBusinessPayment(data.receivedPaymentList, validationElement, validateResponse.messageList, component);
				}
				validateResponse.isValid = (validateResponse.messageList.length > 0) ? false : true;
				component.AppModel.setProperty("/cwsRequest/validationRequest", validationElement);
				return validateResponse;
			},

			/**
			 * Validate Basic Info Duration
			 */
			validateBasicInfoNDuration: function (data, validationElement, messageList, component) {
				var messageElement = {
					"type": "Error",
					"sTitle": component.getI18n("CwsRequest.BasicInfoTitle"),
					"active": false,
					"counter": 0
				};
				var valueFieldProperties = component.getI18n("CwsRequest.basicNDatesFields").split(",");
				var valueStateProperties = component.getI18n("CwsRequest.basicNDatesFieldsVState").split(",");

				jQuery.sap.each(valueFieldProperties, function (i) {
					validationElement[valueStateProperties[i]] = ValueState.None;
					if (!data[valueFieldProperties[i]] || (data[valueFieldProperties[i]] && (parseFloat(data[valueFieldProperties[i]]) <= 0.00 ||
							parseFloat(data[valueFieldProperties[i]]) <= 0))) {
						validationElement[valueStateProperties[i]] = ValueState.Error;
						messageElement.counter += 1;
					}
				});

				if (messageElement.counter > 0) {
					messageElement.message = component.getI18n("CwsRequest.RequiredFields.Message");
					messageList.push(messageElement);
				}
			},
			/**
			 * Validate Client Work Details
			 */
			validateClientWorkDetails: function (data, validationElement, messageList, component) {
				var messageElement = {
					"type": "Error",
					"sTitle": component.getI18n("CwsRequest.ClienWorkTitle"),
					"active": false,
					"counter": 0
				};
				var valueFieldProperties = component.getI18n("CwsRequest.clientWorkFields").split(",");
				var valueStateProperties = component.getI18n("CwsRequest.clientWorkFieldsVState").split(",");

				jQuery.sap.each(valueFieldProperties, function (i) {
					validationElement[valueStateProperties[i]] = ValueState.None;
					if (!data[valueFieldProperties[i]]) {
						validationElement[valueStateProperties[i]] = ValueState.Error;
						messageElement.counter += 1;
					}
				});

				if (messageElement.counter > 0) {
					messageElement.message = component.getI18n("CwsRequest.RequiredFields.Message");
					messageList.push(messageElement);
				}
			},
			/**
			 * Validate Payment Details
			 */

			validatePaymentDetails: function (data, validationElement, messageList, component) {
				var messageElement = {
					"type": "Error",
					"sTitle": component.getI18n("CwsRequest.PaymentTitle"),
					"active": false,
					"counter": 0
				};
				var valueFieldProperties = component.getI18n("CwsRequest.paymentDetails").split(",");
				var valueStateProperties = component.getI18n("CwsRequest.paymentDetailsVState").split(",");

				jQuery.sap.each(data, function (i) {
					validationElement[valueStateProperties[0]] = ValueState.None;
					if (!data[i][valueFieldProperties[0]] || parseInt(data[i][valueFieldProperties[0]], 0) === 0) {
						validationElement[valueStateProperties[0]] = ValueState.Error;
						messageElement.counter += 1;
					}
				});

				if (messageElement.counter > 0) {
					messageElement.message = component.getI18n("CwsRequest.Amount.Message");
					messageList.push(messageElement);
				}
			},

			validateAssistance: function (data, validationElement, messageList, component) {
				var messageElement = {
					"type": "Error",
					"sTitle": component.getI18n("CwsRequest.Assistance"),
					"active": false,
					"counter": 0
				};
				var valueFieldProperties = component.getI18n("CwsRequest.Assistanceprops").split(",");
				var valueStateProperties = component.getI18n("CwsRequest.AssistanceVState").split(",");

				jQuery.sap.each(valueFieldProperties, function (i) {
					validationElement[valueStateProperties[i]] = ValueState.None;
					for (var k = 0; k < data.length; k++) {
						if (!data[k][valueFieldProperties[i]]) {
							validationElement[valueStateProperties[i]] = ValueState.Error;
							messageElement.counter += 1;
						}
					}
				});

				if (messageElement.counter > 0) {
					messageElement.message = component.getI18n("CwsRequest.Assistance.Message");
					messageList.push(messageElement);
				}
			},

			validateAttachments: function (data, validationElement, messageList, component) {
				var messageElement = {
					"type": "Error",
					"sTitle": "Attachment",
					"active": false,
					"counter": 0
				};
				if (!data || data.results.length === 0) {
					messageElement.counter = 1;
				} else {
					messageElement.counter = 0;
				}

				if (messageElement.counter > 0) {
					messageElement.message = component.getI18n("CwsRequest.Attachmnent.Message");
					messageList.push(messageElement);
				}
			},

			validateAttachmentList: function (data, messageKey, messageList, component) {
				var messageElement = {
					"type": "Error",
					"sTitle": "Attachment",
					"active": false,
					"counter": 0
				};
				if (!data || data.results.length === 0) {
					messageElement.counter = 1;
				} else {
					messageElement.counter = 0;
				}

				if (messageElement.counter > 0) {
					messageElement.message = component.getI18n(messageKey);
					messageList.push(messageElement);
				}
				return messageList;
			},

			validateCostPayment: function (data, validationElement, messageList, component) {
				if (component.AppModel.getProperty("/oPaymentDatatable")) {
					var oTotal = 0,
						emessageElement = {
							"type": "Error",
							"sTitle": "Amount details",
							"active": false,
							"counter": 0
						};
					emessageElement.message = component.getI18n("CwsRequest.paymentError.Message");
					messageList.push(emessageElement);
				}
				var oTotal = 0,
					messageElement = {
						"type": "Error",
						"sTitle": "Payment details",
						"active": false,
						"counter": 0
					};

				jQuery.sap.each(data.paymentList, function (p, element) {
					oTotal += element.AMOUNT;
				}.bind(this));

				var status = data.paymentList.find(function (element) {
					return element.PAYMENT_REQ_STATUS === "54";
				}.bind(this));
				if (oTotal !== data.AMOUNT && status) {
					messageElement.counter = 1;
				}
				if (messageElement.counter > 0 && oTotal !== 0) {
					messageElement.message = component.getI18n("CwsRequest.costPayment.Message");
					messageList.push(messageElement);
				}
				return messageList;
			},

			validateNotPaid: function (data, validationElement, messageList, component) {
				var oTotal = 0,
					messageElement = {
						"type": "Error",
						"sTitle": "Payment details",
						"active": false,
						"counter": 0
					};
				jQuery.sap.each(data.paymentList, function (p, element) {
					oTotal += element.AMOUNT;
				}.bind(this));
				var status = data.paymentList.find(function (element) {
					return element.PAYMENT_REQ_STATUS_ALIAS === "Paid";
				}.bind(this));
				if (oTotal !== data.AMOUNT && status) {
					messageElement.counter = 1;
				}
				if (!status && data.REQUEST_STATUS === "38") {
					messageElement.message = component.getI18n("CwsRequest.NotPaid.Message");
					messageList.push(messageElement);
				}
				return messageList;
			},

			validateNegativePay: function (data, validationElement, messageList, component) {
				var messageElement = {
					"type": "Error",
					"sTitle": "Error",
					"active": false,
					"counter": 0
				};

				var containsNegative = data.some(function (element) {
					return element.AMOUNT < 0;
				});

				if (containsNegative) {
					messageElement.message = "The Amount can't be negative, please reject this request.";
					messageList.push(messageElement);
				}
				return messageList;
			},

			validateCostDistribution: function (data, validationElement, messageList, component) {
				var messageElement = {
					"type": "Error",
					"sTitle": component.getI18n("CwsRequest.CostTitle"),
					"active": false,
					"counter": 0
				};

				jQuery.sap.each(data, function (p, element) {
					if (element.WBS === "") {
						element.valueStateWbs = ValueState.Error;
						messageElement.counter += 1;
					}
				}.bind(this));

				if (messageElement.counter > 0) {
					messageElement.message = component.getI18n("CwsRequest.costdist.Message");
					messageList.push(messageElement);
				}
			},

			validateCostDistributionPerc: function (data, validationElement, messageList, component) {
				var oCount = 0,
					messageElement = {
						"type": "Error",
						"sTitle": component.getI18n("CwsRequest.CostTitle"),
						"active": false,
						"counter": 0
					};

				jQuery.sap.each(data, function (p, element) {
					if (element.VALUE) {
						oCount += Number(element.VALUE);
					}
				}.bind(this));
				if (oCount !== 100) {
					messageElement.counter += 1;
				}

				if (messageElement.counter > 0) {
					component.AppModel.setProperty("/oPercentageVState", "Error");
					messageElement.message = component.getI18n("CwsRequest.costdistperc.Message");
					messageList.push(messageElement);
				}
				return messageList;
			},
			validateSelectedProgramManager: function (data, selectedStaffId, validationElement, messageList, component) {
				var oCount = 0,
					messageElement = {
						"type": "Error",
						"sTitle": component.getI18n("CwsRequest.Selection.PM"),
						"active": false,
						"counter": 0
					};

				if (data) {
					messageElement.counter = data.filter(
						element => element.STAFF_ID === component.AppModel.getProperty("/loggedInUserSfStfNumber") || element.STAFF_ID ===
						selectedStaffId
					).length;
				}

				var valueStateProperties = component.getI18n("CwsRequest.SelectionPMState");
				validationElement[valueStateProperties] = ValueState.None;
				if (messageElement.counter > 0) {
					validationElement[valueStateProperties] = ValueState.Error;
					messageElement.message = component.getI18n("CwsRequest.Selection.Message");
					messageList.push(messageElement);
				}
				return messageList;
			},

			validateBusinessPayment: function (data, validationElement, messageList, component) {
				var messageElement = {
					"type": "Error",
					"sTitle": component.getI18n("CwsRequest.PaymentTitle"),
					"active": false,
					"counter": 0
				};
				var valueFieldProperties = component.getI18n("CwsRequest.businesspaymentDetails").split(",");
				var valueStateProperties = component.getI18n("CwsRequest.businesspaymentDetailsVState").split(",");

				jQuery.sap.each(data, function (i) {
					validationElement[valueStateProperties[0]] = ValueState.None;
					if (!data[i][valueFieldProperties[0]]) {
						validationElement[valueStateProperties[0]] = ValueState.Error;
						messageElement.counter += 1;
					}
				});
				jQuery.sap.each(data, function (i) {
					validationElement[valueStateProperties[1]] = ValueState.None;
					if (!data[i][valueFieldProperties[1]]) {
						validationElement[valueStateProperties[1]] = ValueState.Error;
						messageElement.counter += 1;
					}
				});

				if (messageElement.counter > 0) {
					messageElement.message = component.getI18n("CwsRequest.RequiredFields.Message");
					messageList.push(messageElement);
				}
			},

			_fnSubmitValidation: function (component) {
				var aValidation = [];
				var userRole = component.AppModel.getProperty("/userRole");
				var claimItems = component.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
				var claimRequestType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");
				var claimType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimType");
				if (!claimRequestType && userRole === 'ESS') {
					claimRequestType = 'Daily';
				}
				claimItems = Utility._fnSortingEclaimItemData(claimItems);
				var hasValidationError = false;
				var aResultClaimItems = [];
				var aRateTypeList = component.AppModel.getProperty("/claimRequest/selMonthRateTypeNamountList");
				if (!!component.AppModel.getProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID") && !!component.AppModel.getProperty(
						"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID")) {
					if ((component.AppModel.getProperty("/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID") === component.AppModel.getProperty(
							"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID")) && component.AppModel.getProperty(
							"/claimRequest/createClaimRequest/ADD_APP_1_STAFF_ID") !== "" && component.AppModel.getProperty(
							"/claimRequest/createClaimRequest/ADDITIONAL_APP_2_STAFF_ID") !== "") {
						if (!hasValidationError) {
							hasValidationError = true;
						}
						aValidation.push(this._formatMessageList("Error", "Additional Approver", component.getI18n("AdditionalApproverMatch"),
							"Additional Approvers"));
					}
				}

				//validate whether Bank Details and Cost Distribution values are set
				//var staffInfo = component.AppModel.getProperty("/staffInfo");

				var bankInfoFlag = component.AppModel.getProperty("/claimRequest/bankInfoFlag");
				var costDistFlag = component.AppModel.getProperty("/claimRequest/costDistFlag");

				if (bankInfoFlag === 'N') {
					if (!hasValidationError) {
						hasValidationError = true;
					}
					aValidation.push(this._formatMessageList("Error", "Bank Detail", component.getI18n("BankDetails"),
						"Bank Details"));
				}
				if (costDistFlag === 'N') {
					if (!hasValidationError) {
						hasValidationError = true;
					}
					aValidation.push(this._formatMessageList("Error", "Cost Distribution", component.getI18n("CostDistDetails"),
						"Cost Dist"));
				}

				if (claimItems) {
					for (var i = 0; i < claimItems.length; i++) {
						var item = claimItems[i];
						//To default all the Value state and value state text for all the columns
						this._fnDefaultAllValueStateAndValueStateText(item);
						var claimDate = item.CLAIM_START_DATE;
						item.havingAnyError = false;
						if (!item.RATE_TYPE) {
							item.valueStateRateType = "Error";
							item.valueStateTextRateType = "Mandatory field";
							if (!item.havingAnyError) {
								item.havingAnyError = true;
							}
							if (!hasValidationError) {
								hasValidationError = true;
							}
							aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("RateTypeRequired"), claimDate));
						} else if (item.RATE_TYPE === '10') {

							if (!item.START_TIME && claimRequestType === "Daily") {
								item.valueStateStartTime = "Error";
								item.valueStateTextStartTime = "Mandatory field";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("StarttimeRequired"), claimDate));

							}

							if (!item.END_TIME && claimRequestType === "Daily") {
								item.valueStateEndTime = "Error";
								item.valueStateTextEndTime = "Mandatory field";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "End Time", component.getI18n("EndtimeRequired"), claimDate));
							}
							if (item.valueStateEndTime !== "Error" && item.valueStateStartTime !== "Error" && claimRequestType === "Daily") {
								// handling start time
								var claimStartDate = new Date(item.CLAIM_START_DATE);
								var arrStartTime = item.START_TIME.split(":");
								claimStartDate.setHours(parseInt(arrStartTime[0], 10));
								if (arrStartTime.length === 2) {
									claimStartDate.setMinutes(parseInt(arrStartTime[1], 10));
								} else {
									claimStartDate.setMinutes(0);
								}
								//handling end time
								var claimEndDate = new Date(item.CLAIM_END_DATE);
								var arrEndTime = item.END_TIME.split(":");
								claimEndDate.setHours(parseInt(arrEndTime[0], 10));
								if (arrEndTime.length === 2) {
									claimEndDate.setMinutes(parseInt(arrEndTime[1], 10));
								} else {
									claimEndDate.setMinutes(0);
								}

								//calculate hours between two dates
								var differenceHours = Math.abs(claimEndDate - claimStartDate) / 36e5;
								var calcDifferenceHours = differenceHours;
								var timeLimit;
								/*if (claimStartDate.getDay() >= 1 && claimStartDate.getDay() <= 4) {
									if (differenceHours >= 8.5) {
										calcDifferenceHours = differenceHours - 1;
										timeLimit = calcDifferenceHours;
									} else {
										timeLimit = differenceHours;
									}

								} else if (claimStartDate.getDay() === 5) {
									if (differenceHours >= 8) {
										calcDifferenceHours = differenceHours - 1;
										timeLimit = calcDifferenceHours;
									} else {
										timeLimit = differenceHours;
									}

								}*/

								/****** Changed computation Logic for PTT - to deduct 1 hour if the staff has worked for 8 hours or more ****/
								if (claimType === component.getI18n("PTT") && differenceHours >= 8) {
									calcDifferenceHours = differenceHours - 1;
									timeLimit = calcDifferenceHours;
								} else {
									timeLimit = differenceHours;
									timeLimit = timeLimit.toFixed(2);
								}
								/**** End of Change for Computation Logic *****/

								if (parseFloat(item.HOURS_UNIT) > parseFloat(timeLimit)) {
									//	item.HOURS_UNIT = calcDifferenceHours;
									//	} else {
									if (!item.havingAnyError) {
										item.havingAnyError = true;
									}
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("CalculatedHours"), claimDate));
								}

								item.claimStartDate = claimStartDate;
								item.claimEndDate = claimEndDate;

							}
							if (item.claimStartDate > item.claimEndDate) {
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("StartTimeGtEndTime"), claimDate));
							}

						}

						if (item.IS_DISCREPENCY) {
							if (!item.DISC_RATETYPE_AMOUNT) {
								item.valueStateDiscAmount = "Error";
								item.valueStateTextDiscAmount = "Mandatory field";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Discrepency Rate Amount", component.getI18n("DiscRateTypeAmountRequired"),
									claimDate));
							} else {
								for (var k = 0; k < aRateTypeList.length; k++) {
									if (item.RATE_TYPE === aRateTypeList[k].RateTypeCode) {
										if (parseFloat(item.DISC_RATETYPE_AMOUNT) > parseFloat(aRateTypeList[k].MAX_LIMIT)) {
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											var sMessage = aRateTypeList[k].RateTypeDesc + " rate cannot exceed $" + aRateTypeList[k].MAX_LIMIT;
											aValidation.push(this._formatMessageList("Error", "Amount Discrepancy", sMessage, claimDate));
										}
									}
								}
							}
							if (!item.REMARKS) {
								item.valueStateDiscAmount = "Error";
								item.valueStateTextDiscAmount = "Mandatory field";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Remarks", component.getI18n("RemarksRequired"), claimDate));

							}

						} else {
							for (var k = 0; k < aRateTypeList.length; k++) {
								if (item.RATE_TYPE === aRateTypeList[k].RateTypeCode) {
									if (parseFloat(item.RATE_TYPE_AMOUNT) > parseFloat(aRateTypeList[k].MAX_LIMIT)) {
										if (!item.havingAnyError) {
											item.havingAnyError = true;
										}
										if (!hasValidationError) {
											hasValidationError = true;
										}
										var sMessage = aRateTypeList[k].RateTypeDesc + " rate cannot exceed $" + aRateTypeList[k].MAX_LIMIT;
										aValidation.push(this._formatMessageList("Error", "Amount Discrepancy", sMessage, claimDate));
									}
								}
							}
						}

						// wbs check
						if (item.WBS) {
							//call WBS validate API 
							var oHeaders = Utility._headerToken(component);
							var wbsSetItem = {};
							var saveObj = {};
							wbsSetItem.WBS = [];
							wbsSetItem.WBS.push(item.WBS);
							saveObj.WBSRequest = wbsSetItem;
							var serviceUrl = Config.dbOperations.checkWbs;
							var wbsValidateModel = new sap.ui.model.json.JSONModel();
							wbsValidateModel.loadData(serviceUrl, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
							if (wbsValidateModel.getData().EtOutput.item.EvStatus === 'E') {
								item.valueStateWbs = "Error";
								item.valueStateTextWbs = wbsValidateModel.getData().EtOutput.item.EvMsg;
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "WBS Element", wbsValidateModel.getData().EtOutput.item.EvMsg, claimDate));
							} else {
								item.WBS = wbsValidateModel.getData().EtOutput.item.EvActwbs;
								item.WBS_DESC = wbsValidateModel.getData().EtOutput.item.EvWbsdesc;
							}
						} else {
							item.valueStateWbs = "None";
							item.valueStateTextWbs = "";
						}

						//future dated records cannot be submitted
						if (new Date(item.CLAIM_END_DATE) > new Date()) {
							if (!item.havingAnyError) {
								item.havingAnyError = true;
							}
							if (!hasValidationError) {
								hasValidationError = true;
							}
							aValidation.push(this._formatMessageList("Error", "Date", component.getI18n("RestrictingFutureDated"), claimDate));
						}

						//check for max limit for the individate rates

						// handling overlapping check
						// var claimRequestType = component.AppModel.getProperty("/claimRequest/createClaimRequest/claimRequestType");
						for (var c = 0; c < claimItems.length; c++) { //running loop to handle for each date
							var comparingItem = claimItems[c];
							if (claimRequestType === "Daily") {
								if ((item.CLAIM_START_DATE === comparingItem.CLAIM_START_DATE) && (c !== i)) {

									//not more than one per script allowed
									//rate code is 14
									if (item.RATE_TYPE === '10' && comparingItem.RATE_TYPE === '10') {
										// handling start time
										var claimStartDate = new Date(comparingItem.CLAIM_START_DATE);
										var arrStartTime = comparingItem.START_TIME.split(":");
										claimStartDate.setHours(parseInt(arrStartTime[0], 10));
										if (arrStartTime.length === 2) {
											claimStartDate.setMinutes(parseInt(arrStartTime[1], 10));
										} else {
											claimStartDate.setMinutes(0);
										}
										//handling end time
										var claimEndDate = new Date(comparingItem.CLAIM_END_DATE);
										//var arrEndTime = item.END_TIME.split(":");
										var arrEndTime = comparingItem.END_TIME.split(":");
										claimEndDate.setHours(parseInt(arrEndTime[0], 10));
										if (arrEndTime.length === 2) {
											claimEndDate.setMinutes(parseInt(arrEndTime[1], 10));
										} else {
											claimEndDate.setMinutes(0);
										}

										if ((claimStartDate > item.claimStartDate && claimStartDate < item.claimEndDate) || (claimEndDate > item.claimStartDate &&
												claimEndDate < item.claimEndDate)) {
											item.valueStateEndTime = "Error";
											item.valueStateTextEndTime = "Overlapping Issue";
											comparingItem.valueStateEndTime = "Error";
											comparingItem.valueStateTextEndTime = "Overlapping Issue";

											item.valueStateStartTime = "Error";
											//	item.valueStateStartTime = "Overlapping Issue";
											//	comparingItem.valueStateEndTime = "Error";
											comparingItem.valueStateStartTime = "Error";
											comparingItem.valueStateTextStartTime = "Overlapping Issue";
											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											aValidation.push(this._formatMessageList("Error", "Claim Dates", component.getI18n("OverlappingIssue"), claimDate));
										}

									}

									//hourly and monthly cannot be possible
									if ((item.RATE_TYPE === '10' && comparingItem.RATE_TYPE === '11') || (comparingItem.RATE_TYPE === '10' && item.RATE_TYPE ===
											'11')) {
										item.valueStateRateType = "Error";
										item.valueStateTextRateType = "Mandatory field";
										if (!item.havingAnyError) {
											item.havingAnyError = true;
										}
										if (!hasValidationError) {
											hasValidationError = true;
										}
										aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("RateTypeHourlyMonthlyMismatch"), claimDate));
									}
									//not more than one per script allowed
									//rate code is 14
									if (item.RATE_TYPE === '14' && comparingItem.RATE_TYPE === '14') {
										item.valueStateRateType = "Error";
										item.valueStateTextRateType = "Mandatory field";
										if (!item.havingAnyError) {
											item.havingAnyError = true;
										}
										if (!hasValidationError) {
											hasValidationError = true;
										}
										aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("PerScriptMismatch"), claimDate));
									}
									//not more than one per student allowed
									//rate code is 12
									if (item.RATE_TYPE === '12' && comparingItem.RATE_TYPE === '12') {
										item.valueStateRateType = "Error";
										item.valueStateTextRateType = "Mandatory field";
										if (!item.havingAnyError) {
											item.havingAnyError = true;
										}
										if (!hasValidationError) {
											hasValidationError = true;
										}
										aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("PerStudentMismatch"), claimDate));
									}

								}
							} else {
								if ((c !== i)) {

									//hourly and monthly cannot be possible
									if ((item.RATE_TYPE === '10' && comparingItem.RATE_TYPE === '11') || (comparingItem.RATE_TYPE === '10' && item.RATE_TYPE ===
											'11')) {
										item.valueStateRateType = "Error";
										item.valueStateTextRateType = "Mandatory field";
										if (!item.havingAnyError) {
											item.havingAnyError = true;
										}
										if (!hasValidationError) {
											hasValidationError = true;
										}
										aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("RateTypeHourlyMonthlyMismatch"), claimDate));
									}

									if ((item.CLAIM_START_DATE >= comparingItem.CLAIM_START_DATE && item.CLAIM_START_DATE <= comparingItem.CLAIM_END_DATE)) {
										//check same rate type for overlapping
										if (item.RATE_TYPE === comparingItem.RATE_TYPE) {

											item.valueStateStartDate = "Error";
											item.valueStateTextStartDate = "Period Overlapping";
											comparingItem.valueStateStartDate = "Error";
											comparingItem.valueStateTextStartDate = "Period Overlapping";

											item.valueStateEndDate = "Error";
											item.valueStateTextEndDate = "Period Overlapping";
											comparingItem.valueStateEndDate = "Error";
											comparingItem.valueStateTextEndDate = "Period Overlapping";

											if (!item.havingAnyError) {
												item.havingAnyError = true;
											}
											if (!hasValidationError) {
												hasValidationError = true;
											}
											aValidation.push(this._formatMessageList("Error", "Claim Dates", component.getI18n("OverlappingPeriodIssues"), claimDate));
										}
									}
								}
							}

						}
						if (userRole === "CA") {
							if (!item.RATE_TYPE_AMOUNT || parseInt(item.RATE_TYPE_AMOUNT) <= 0) {
								item.valueStateRateAmount = "Error";
								item.valueStateTextRateAmount = "Mandatory field";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Rate Amount", component.getI18n("RateAmountRequired"), claimDate));
							}
							if (!item.HOURS_UNIT) {
								item.valueStateHoursOrUnit = "Error";
								item.valueStateTextHoursOrUnit = "Mandatory field";
								if (!item.havingAnyError) {
									item.havingAnyError = true;
								}
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Hours / Unit", component.getI18n("HoursUnitRequired"), claimDate));
							}
						}
						aResultClaimItems.push(item);
					}

				}
				component.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", aResultClaimItems);
				component.AppModel.setProperty("/claimRequest/createClaimRequest/singleRequestErrorMessages", aValidation);
				return {
					"hasValidationError": hasValidationError
				};
			},

			_fnRejectValidation: function (component) {
				var aValidation = [];
				//	var userRole = component.AppModel.getProperty("/userRole");
				//	var claimItems = component.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
				//	claimItems = Utility._fnSortingEclaimItemData(claimItems);;
				var hasValidationError = false;
				var remarks = component.AppModel.getProperty("/claimRequest/createClaimRequest/REMARKS");
				if (!remarks.length) {
					if (!hasValidationError) {
						hasValidationError = true;
					}
					aValidation.push(this._formatMessageList("Error", "Remarks", component.getI18n("RemarksMatch"),
						""));
				}
				component.AppModel.setProperty("/claimRequest/createClaimRequest/singleRequestErrorMessages", aValidation);
				return {
					"hasValidationError": hasValidationError
				};
			},

			_fnDefaultAllValueStateAndValueStateText: function (item) {
				//default the value state and value state text for all the columns
				item.valueStateStartDate = "None";
				item.valueStateTextStartDate = "";
				item.valueStateEndDate = "None";
				item.valueStateTextEndDate = "";
				item.valueStateStartTime = "None";
				item.valueStateTextStartTime = "";
				item.valueStateEndTime = "None";
				item.valueStateTextEndTime = "";
				item.valueStateHoursOrUnit = "None";
				item.valueStateTextHoursOrUnit = "";
				item.valueStateRateType = "None";
				item.valueStateTextRateType = "";
				item.valueStateRateAmount = "None";
				item.valueStateTextRateAmount = "";
				item.valueStateDiscAmount = "None";
				item.valueStateTextDiscAmount = "";
				item.valueStateWbs = "None";
				item.valueStateTextWbs = "";
				return item;
			},
			removeTimeFromDate: function (date) {
				date.setHours(0, 0, 0, 0);
				return date;
			},

			validateLeavingDate: function (data, component) {
				var message = "",
					messageElement = {
						"type": "Error",
						"sTitle": "Last Day Validation",
						"active": false,
						"counter": 0
					};
				if (data.LEAVING_DATE) {
					var oEndDate = this.removeTimeFromDate(new Date(data.END_DATE));
					if (oEndDate > new Date(data.LEAVING_DATE)) {
						messageElement.counter += 1;
					}
				}
				if (messageElement.counter > 0) {
					var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
						pattern: "d MMM yyyy"
					});
					var dojDate = oDateFormat.format(new Date(data.LEAVING_DATE));
					message = "Staff’s last day of service is " + dojDate + ". Hence, above End Date cannot be after this date.";
				}
				return message;
			},

			_formatMessageList: function (type, sColumnName, message, claimDate) {
				var messageObj = {};
				messageObj.type = type;

				if (claimDate) {
					messageObj.displayIdx = claimDate;
					messageObj.sTitle = "Claim Date : " + messageObj.displayIdx + "\n Column :" + sColumnName;
					messageObj.idx = claimDate;
				} else {
					messageObj.sTitle = sColumnName;
				}
				messageObj.title = sColumnName;
				messageObj.state = type;
				messageObj.message = message;

				return messageObj;
			}
		});
		return validation;
	},
	true);