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
				attachmentsView : "/attachments_data",
				approverMatrixView : "/v_approval_maxtrix",
				taskDetails : "/taskdetails_data",
				uluFdluDetails : "/fdluulu_data",
				chrsJobInfo: "/ChrsJobInfos",
				userLookup : "/v_user_lookup",
				remarksData : "/remarks_data",
				taskInboxView : "/v_task_inbox",
				checkWbs: "/ecpWbsValidate",
				processParticipants : "/processparticipants_data",
				activeInactiveUserLookup : "/v_active_inactive_user_lookup",
				fetchClaimType: "/rest/eclaims/fetchClaimTypes?staffId=",
				caStaffLookUp: "/caStaffLookup",
				fetchDraftClaim: "/rest/eclaims/draftEclaimData",
				saveCwRequest: "/rest/cw/singleRequestCreation",
				requestLock: "/requestLock",
				deleteReqUrl: "/delete/cwRequest",
				deleteRemarks: "/odata/eclaims/RemarksDatas",
				uploadAttachment: "/cwUploadAttachment",
				deleteAttachment: "/deleteAttachment",
				fetchAttachment: "/fetchAttachment",
				syncAttachment: "/syncAttachmentsForRequest",
				utilizationDays: "/totalUtilization",
				massUpload: "/massCwRequestsCreation",
				oPaymentList: "/populatePaymentList",
				requestDetails: "/requestStatusDetails",
				payrollArea: "/payrollArea",
				deleteMassAttachment: "/deleteAttachmentById",
				massUploadAttach: "/uploadZipAttachmentUpload",
				fetchTaskAgent: "/workFlowUserDetails",
				weekendValidateUrl: "/validateWorkingHours"
			}

		};
	});