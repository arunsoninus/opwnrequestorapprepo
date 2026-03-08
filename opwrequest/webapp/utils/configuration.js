sap.ui.define([],
	function () {

		return {
			getRandomNumber: function () {
				return Math.floor(Math.random() * Math.floor(5));
			},
			taskOperations: {},
			gwTaskOperations: {},
			sfOperations: {},
			processOperations: {},
			dbOperations: {
				userDetails: "/getUserDetails()",
				photoApi: "/getPhoto",
				quickViewUserDetails : "/fetchUserDetails",
				fetchFilterLookup: "/rest/eclaims/filter",
				taskProcessHistory: "/rest/inbox/getProcessTrackerDetails?draftId=",
				taskProcessHistoryNew: "/getProcessTrackerForNewNChangeRequests",
				// metadataClaims: "/odata/eclaims",
				openRequestView : "/cwsRequestViews",
				requestViewCount: "/cwsRequestViews/$count",
				cwsAppConfigs: "/cwsappconfig_data",
				statusConfig: "/statusconfig_data",
				chrsJobInfo: "/ChrsJobInfos",
				userLookup : "/v_user_lookup",
				fetchClaimType: "/rest/eclaims/fetchClaimTypes?staffId=",
				caStaffLookUp: "/rest/eclaims/caStaffLookup",
				fetchDraftClaim: "/rest/eclaims/draftEclaimData",
				saveCwRequest: "/rest/cw/singleRequestCreation",
				requestLock: "/rest/eclaims/requestLock",
				deleteReqUrl: "/rest/cw/delete/cwRequest",
				deleteRemarks: "/odata/eclaims/RemarksDatas",
				uploadAttachment: "/rest/attachments/cwUploadAttachment",
				deleteAttachment: "/rest/attachments/deleteAttachment",
				fetchAttachment: "/rest/attachments/fetchAttachment",
				syncAttachment: "/rest/attachments/syncAttachmentsForRequest",
				utilizationDays: "/rest/cw/totalUtilization",
				massUpload: "/rest/cw/massCwRequestsCreation",
				oPaymentList: "/rest/opwn/populatePaymentList",
				requestDetails: "/rest/cw/requestStatusDetails",
				authorizeTokenNew: "/tokenauthorize",
				payrollArea: "/payrollArea",
				deleteMassAttachment: "/rest/attachments/deleteAttachmentById",
				massUploadAttach: "/rest/attachments/uploadZipAttachmentUpload",
				fetchTaskAgent: "/rest/inbox/workFlowUserDetails",
				weekendValidateUrl: "/rest/utils/validateWorkingHours"
			}

		};
	});