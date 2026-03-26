sap.ui.define([
	"sap/m/MessageBox",
	"./services",
	"./utility",
	"./configuration",
	"./dataformatter",
	'sap/ui/export/library',
], function (MessageBox, Services, Utility, Config, Formatter,exportLibrary) {
	"use strict";
	var EdmType = exportLibrary.EdmType;

	return {
		_onPressMassUploadTemplate: function (component) {
			try {
				component.showBusyIndicator();
				component.AppModel.setProperty("/cwsRequest/createCWSRequest/massUploadResponseDisplay", []);
				component.AppModel.setProperty("/cwsRequest/createCWSRequest/massUploadRequestPayload", []);
				var fileUploader = component.getUIControl("massClaimsUploadId", "NewRequestTypeSelectionDialog");
				var file = fileUploader.oFileUpload.files[0];
				var requestType = component.AppModel.getProperty("/cwsRequest/Request_key");
				var claimType = component.AppModel.getProperty("/cwsRequest/createCWSRequest/TYPE");
				var noOfHeaderRows = component.AppModel.getProperty("/cwsRequest/createCWSRequest/noOfHeaderRows");

				if (!noOfHeaderRows) {
					MessageBox.error(component.getI18n("CwsRequest.MassUpload.HeaderRows"));
					return;
				} else if (!file) {
					MessageBox.error(component.getI18n("CwsRequest.MassUpload.UploadFile"));
					return;
				}

				if (isNaN(parseInt(noOfHeaderRows))) {
					noOfHeaderRows = 0;
				}
				var form = new FormData();
				form.append("excelFile", file, file.name);
				form.append("processCode", "203");
				form.append("type", claimType);
				form.append("requestType", "OPWN");
				// form.append("period", period);
				form.append("noOfHeaderRows", noOfHeaderRows - 1);
				var oHeaders = Utility._headerToken(component);
				delete oHeaders['Content-Type'];
				var settings = {
					"url": "/rest/excelUpload/cwsRequestUpload",
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
							component.AppModel.setProperty("/cwsRequest/createCWSRequest/massUploadResponse", parseResponse);
							component.AppModel.setProperty("/cwsRequest/createCWSRequest/massUploadResponseDisplay", parseResponse.displayPayload);
							component.AppModel.setProperty("/cwsRequest/createCWSRequest/massUploadRequestPayload", parseResponse.requestPayload);
							component.onSelectIconStatus();
							if (parseResponse.displayPayload.length > 0) {
								component.AppModel.setProperty("/PaymentData", parseResponse.displayPayload[0]);
							}
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
							MessageBox.error("Failed to upload request data.");
						} finally {}
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
			} catch (oError) {
				MessageBox.error(component.getI18n("CwsRequest.MassUpload.DataUploadFailed"));
			} finally {
				component.hideBusyIndicator();
			}
		},

		_createColumnConfig: function () {
			return [{
				label: 'S.No',
				property: 'serialNo',
				type: EdmType.Number,
				width: '6'
			}, {
				label: 'Staff ID',
				property: 'STAFF_ID',
				type: EdmType.Number,
				width: '10'
			}, {
				label: 'Staff Name',
				property: 'FULL_NAME',
				width: '10'
			}, {
				label: 'Start Date',
				property: 'START_DATE',
				type: EdmType.DateTime,
				width: '25'
			}, {
				label: 'End Date',
				property: 'END_DATE',
				type: EdmType.DateTime,
				width: '25'
			}, {
				label: 'Duration',
				property: 'DURATION_DAYS',
				width: '10'
			}, {
				label: 'Sub-Type',
				property: 'SUB_TYPE',
				width: '18'
			}, {
				label: 'Amount Payable to Staff',
				property: 'amount',
				width: '5'
			}, {
				label: 'ULU of Engaging Department',
				property: 'ULU',
				width: '10'
			}, {
				label: 'FDLU of Engaging Department',
				property: 'FDLU',
				width: '10'
			}, {
				label: 'Location',
				property: 'LOCATION',
				width: '5'
			}, {
				label: 'Program Name',
				property: 'program_NAME',
				width: '40'
			}, {
				label: 'Details of Work',
				property: 'WORK_DETAILS',
				width: '30'
			}, {
				label: 'Usage of NUS Property',
				property: 'PROPERTY_USAGE',
				width: '20'
			}, {
				label: 'Details of Property Used',
				property: 'PROPERTY_DETAILS',
				width: '30'
			}, {
				label: 'Error',
				property: 'Error',
				width: '10'
			}];
		},
		_onMessagePopoverPress: function (oEvent, component, key) {
			var oView = component.getView();
			var oSourceControl = oEvent.getSource();
			var arrayPath = key === "E" ? "/validationResults" : "/warningValidationResults";
			var sPath = oSourceControl.getBindingContext("AppModel").getPath();
			if (!component._pMessagePopover) {
				component._pMessagePopover = sap.ui.xmlfragment("fragErrMessPopOver",
					"nus.edu.sg.opwrequest.view.fragments.detaillayout.MassUploadMessagePopover", component);
				oView.addDependent(component._pMessagePopover);
			}
			sap.ui.core.Fragment.byId("fragErrMessPopOver", "massUploadErroPopOver").bindAggregation("items", {
				template: new sap.m.MessageItem({
					title: "{AppModel>field}",
					subtitle: "{AppModel>message}",
					description: "{AppModel>message}",
					type: "Error"
				}),
				path: "AppModel>" + sPath + arrayPath
			});
			component._pMessagePopover.openBy(oSourceControl);
		},
		_fnPostMassSubmission: function (aPayload, component) {
			var msg, serviceUrl = Config.dbOperations.massUpload;
			Services._loadDataUsingJsonModel(component, serviceUrl, aPayload, "POST", function (oData) {
				var response = oData.getSource().getData();
				if (Object.keys(response).length > 0) {
					if (response.error) {
						component.hideBusyIndicator();
						msg = (response.message) ? response.message : "Failed to create the data.\n Please try again.";
						MessageBox.error(msg);
					} else {
						// var requestIDs = response.cwResponse.map(item => item.statusCode === "S" ? item.REQUEST_ID : item.message).join(', ');
						// MessageBox.success("Request/s (" + requestIDs + ") submitted successfully.");

						var oValue = response.cwResponse.filter((item) => item.statusCode === "S");
						// if (oValue.length > 0) {
						// 	component.onPressmasscancel();
						// }
						component.AppModel.setProperty("/oSuccessData", response.cwResponse);

						//Update a Flag for Mass Submission in Attachment Data - Added on 3rd Oct 2024
						Services.performAttrUpdate(component);
						//Flag for Mass Submission in Attachment Data - Added on 3rd Oct 2024

						component.onPressmasscancel();
						component._fnHandleSubmission();
						component._fnReadAfterMetadataLoaded(component.getComponentModel("CwsSrvModel"));
					}
				} else {
					component.hideBusyIndicator();
					msg = (response.message) ? response.message : "Failed to create the data. \n Please try again.";
					MessageBox.error(msg);
				}
				component.hideBusyIndicator();
			}.bind(component));
		}

	};
	return massUploadHelper;
}, true);