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
				taskProcessHistoryNew: "/getProcessTrackerForNewNChangeRequests",
				openRequestView : "/cwsRequestViewsV2",
				requestViewCount: "/cwsRequestViewsV2/$count",
				cwsAppConfigs: "/cwsappconfig_data",
				statusConfig: "/statusconfig_data",
				attachmentsView : "/attachments_data",
				approverMatrixView : "/v_approval_maxtrix",
				taskDetails : "/taskdetails_data",
				uluFdluDetails : "/fdluulu_data",
				userLookup : "/v_user_lookup",
				remarksData : "/remarks_data",
				taskInboxView : "/v_task_inbox",
				checkWbs: "/ecpWbsValidate",
				processParticipants : "/processparticipants_data",
				activeInactiveUserLookup : "/v_active_inactive_user_lookup",
				caStaffLookUp: "/caStaffLookup",
				requestLock: "/requestLock",
				deleteReqUrl: "/purgeCWRequest",
				deleteRemarks: "/remarks_data",
				uploadAttachment: "/cwUploadAttachmentOAuth",
				deleteAttachment: "/deleteAttachmentOAuth",
				fetchAttachment: "/fetchAttachment",
				syncAttachment: "/syncAttachmentsForRequest",
				utilizationDays: "/totalUtilization",
				massUpload: "/massCwRequestsCreation",
				oPaymentList: "/populatePaymentList",
				requestDetails: "/requestStatusDetails",
				payrollArea: "/payrollAreaDetails",
				deleteMassAttachment: "/deleteAttachmentByIdOAuth",
				massUploadAttach: "/uploadZipAttachmentOAuth",
				fetchTaskAgent: "/workFlowUserDetails",
				weekendValidateUrl: "/validateWorkingHours",
				auditLogApi : "/getAuditLogData",
				dashboardData : "/dashboard_data",
				scanFile: "/scanFile"
			}

		};
	});