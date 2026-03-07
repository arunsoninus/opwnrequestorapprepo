sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device",
	"./configuration"
], function (JSONModel, Device, Config) {
	"use strict";

	return {
		"attachmentList": [],
		"showSearchField": false,
		"rejectionRemarks": "",
		"isClaimLocked": false,
		"isClaimLockedMessage": true,
		"disclaimerConfirmChecked": false,
		"claimAuthorizations": [],
		"sClaimaintListUluFdlu": "",
		"iconTabBarSelectedKey": "Draft",
		"showSaveButton": true,
		"showSubmitButton": true,
		"showWithdrawButton": false,
		"showRetractButton": false,
		"showCheckButton": false,
		"showRejectButton": false,
		"showVerifyButton": false,
		"showApproveButton": false,
		"showApproverText": false, //Added Phase 2 Release 1
		"isFormEditable": false,
		"isUluEnabled": true,
		"isFdluEnabled": false,
		"showAdditonalApprover2": false,
		"showAdditionalApproverLink": true,
		"showRemoveAdditionalApproverLink": false,
		"exitFullScreen": true,
		"closeColumn": true,
		"isFlpBackButtonPressed": "",
		"requiredUiControl": {
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

		},
		"processFlowRequestID": "",
		"processNode": {
			"nodes": [],
			"lanes": []
		},
		"errorMessage": [],
		"errorMessages": {
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
		},
		"token": null,
		"loggedInUserId": null,
		"loggedInUserInfo": {},
		"enable": {
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
		},
		"visibility": {
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
		},
		"userRole": null,
		"cwsRequest": {
			"selectedDates": [],
			"disabledDates": [],
			"createCWSRequest": {
				// "START_DATE": "2021-01-01",
				// "END_DATE": "2021-12-31",
				"massUploadResponseDisplay": [{}],
				"singleRequestErrorMessages": [],
				"paymentList": [],
				"durationSplitList": [],
				"assistanceList": [],
				"REMARKS": []
			}
		},
		"staffList": [],
		"otherAssignments": [],
		"months": {
			"JANUARY": "01",
			"FEBRUARY": "02",
			"MARCH": "03",
			"APRIL": "04",
			"MAY": "05",
			"JUNE": "06",
			"JULY": "07",
			"AUGUST": "08",
			"SEPTEMBER": "09",
			"OCTOBER": "10",
			"NOVEMBER": "11",
			"DECEMBER": "12"
		},
		"monthNames": ["January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"
		],
		"days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
		"filterLookupData": {
			"REQ_ID": [{
				"RequestId": "REQ002",
				"StatusCode": "1"
			}],
			"CLAIM_TYPE": [{
				"ClaimTypeId": "1",
				"ClaimTypeDesc": "PTT"
			}],
			"PERIOD": [{
				"Month": "June",
				"Year": "2022"
			}],
			"STATUS": [{
				"StatusID": "1",
				"StatusDesc": "Pending"
			}]
		},
		"sortingLookupData": [{
			"key": "REQUEST_ID",
			"selectedStatus": true,
			"text": "Request ID"
		}, {
			"key": "PROCESS_TITLE",
			"selectedStatus": false,
			"text": "Request Type"
		}, {
			"key": "SUB_TYPE_T",
			"selectedStatus": false,
			"text": "Sub Type"
		}, {
			"key": "START_DATE",
			"selectedStatus": false,
			"text": "Start Date"
		}, {
			"key": "END_DATE",
			"selectedStatus": false,
			"text": "End Date"
		}, {
			"key": "STATUS_ALIAS",
			"selectedStatus": false,
			"text": "Status"
		}, {
			"key": "SUBMITTED_ON_TS",
			"selectedStatus": false,
			"text": "Submitted On"
		}, {
			"key": "SUBMITTED_BY_NID",
			"selectedStatus": false,
			"text": "Submitted By"
		}],
		"groupLookupData": [{
			"key": "REQUEST_ID",
			"selectedStatus": true,
			"text": "Request ID"
		}, {
			"key": "PROCESS_TITLE",
			"selectedStatus": false,
			"text": "Request Type"
		}, {
			"key": "SUB_TYPE_T",
			"selectedStatus": false,
			"text": "Sub Type"
		}, {
			"key": "START_DATE",
			"selectedStatus": false,
			"text": "Start Date"
		}, {
			"key": "END_DATE",
			"selectedStatus": false,
			"text": "End Date"
		}, {
			"key": "STATUS_ALIAS",
			"selectedStatus": false,
			"text": "Status"
		}, {
			"key": "SUBMITTED_ON_TS",
			"selectedStatus": false,
			"text": "Submitted On"
		}, {
			"key": "SUBMITTED_BY_NID",
			"selectedStatus": false,
			"text": "Submitted By"
		}],
		"employeeInformation": {
			"pageId": "employeePageId",
			"header": "Employee Info",
			"icon": "test-resources/sap/ui/documentation/sdk/images/johnDoe.png",
			"displayShape": "Circle",
			"title": "Michael Muller",
			"description": "Account Manager",
			"groups": [{
				"heading": "User Details",
				"elements": [{
						"label": "Company",
						"value": ""
					}, {
						"label": "ULU",
						"value": ""
					}, {
						"label": "Job Grade",
						"value": ""
					}, {
						"label": "Email",
						"value": "",
						"emailSubject": "Subject",
						"elementType": "email"
					}, {
						"label": "Employee Category",
						"value": ""
					}
					// , {
					// 	"label": "Employee Group",
					// 	"value": ""
					// }
				]
			}]
		}

	};
});