sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"./configuration", "./dataformatter", "./headerHelper"
], function (JSONModel, Config, Formatter, HeaderHelper) {
	"use strict";

	return {

		getUserInfoDetails: function (component, callBackFx) {
			var UtilitySrvModel = component.getComponentModel("UtilitySrvModel");
			let sUrl = Config.dbOperations.userDetails;
			var oHeaders = HeaderHelper._headerToken() || null;

			this._readDataUsingOdataModel(
				sUrl,
				UtilitySrvModel,
				component,
				[],
				function (response) {
					callBackFx(response)
				}.bind(this),
				oHeaders,
				{}
			);
		},

		// fetchLoggedUserToken: function (sThis, callBackFx) {
		// 	var that = this;
		// 	var userModel = new JSONModel();
		// 	userModel.loadData("/services/userapi/currentUser", null, false);
		// 	sap.ui.getCore().setModel(userModel, "userapi");
		// 	userModel.dataLoaded().then(function () {
		// 		var sUserName = sap.ui.getCore().getModel("userapi").getData().name;
		// 		// sUserName = '<username for debug>';
		// 		sThis.AppModel.setProperty("/loggedInUserId", sUserName);
		// 		that._getUserDetails(sThis, sUserName, callBackFx);
		// 	}.bind(sThis));
		// },
		// _getUserDetails: function (sThis, sUserName, callBackFx) {
		// 	try {
		// 		var oHeaders = {
		// 			"Content-Type": "application/json"
		// 		};
		// 		var Payload = {
		// 			"userName": sUserName
		// 		};

		// 		var authModel = new JSONModel();
		// 		authModel.loadData(Config.dbOperations.authorizeTokenNew, JSON.stringify(Payload), null, "POST", null, null, oHeaders);
		// 		authModel.attachRequestCompleted(function (oResponse) {
		// 			var tokenDetails = oResponse.getSource().getData();
		// 			var userDetails = this.getUserInfoDetails(tokenDetails.token);
		// 			Object.assign(userDetails, tokenDetails);
		// 			callBackFx(userDetails);
		// 		}, this);
		// 	} catch (e) {
		// 		sap.m.MessageToast.show("Service temporarily down for maintenance. Excuse us for the inconvenience.");
		// 	}
		// },
		// getLoggedInUserToken: function (sUserName) {
		// 	var oHeaders = {
		// 		"Content-Type": "application/json"
		// 	};
		// 	var Payload = {
		// 		"userName": sUserName
		// 	};
		// 	var authModel = new JSONModel();
		// 	authModel.loadData(Config.dbOperations.authorizeTokenNew, JSON.stringify(Payload), null, "POST", null, null, oHeaders);
		// 	authModel.attachRequestCompleted(function (oResponse) {
		// 		callBackFx(oResponse.getSource().getData().token);
		// 	}, this);

		// 	// var authModel = new JSONModel();
		// 	// authModel.loadData(Config.dbOperations.authorizeToken + sUserName, null, false, "GET", false, false);
		// 	// return authModel.getData();
		// },
		// getUserInfoDetails: function (userToken) {
		// 	var userInfoModel = new JSONModel();
		// 	var oHeaders = Formatter._amendHeaderToken(null, userToken);
		// 	userInfoModel.loadData(Config.dbOperations.userDetails, null, false, "GET", false, false, oHeaders);
		// 	return userInfoModel.getData();
		// },
		fetchLoggeInUserImage: function (sThis, callBackFx) {
			var oPhotoModel = new JSONModel();
			var sUrl = Config.dbOperations.fetchPhotoUser;
			var staffId = sThis.AppModel.getProperty("/loggedInUserStfNumber");
			sUrl = sUrl + "?userId=" + staffId;
			// sUrl = sUrl + "?userId=CHELUK";
			//sUrl = sUrl + "?userId=10000027";
			var token = sThis.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token
			};
			oPhotoModel.loadData(sUrl, null, null, "GET", null, null, oHeaders);
			oPhotoModel.attachRequestCompleted(function (oResponse) {
				if (oResponse.getSource().getData().d.results instanceof Array) {
					callBackFx(oResponse.getSource().getData().d.results[0]);
				} else {
					callBackFx({});
				}
			}.bind(sThis));

		},

		fetchPhotoOfUser: function (component, staffId) {
			var oPhotoModel = new JSONModel();
			var UtilitySrvModel = component.getComponentModel("UtilitySrvModel");
			var sUrl = UtilitySrvModel.sServiceUrl + Config.dbOperations.photoApi;
			sUrl = sUrl + "?userId=" + staffId;
			oPhotoModel.loadData(sUrl, null, false, "GET", null, null, HeaderHelper._headerToken());
			oPhotoModel.attachRequestCompleted(function (oResponse) {
				component.AppModel.setProperty("/cwsRequest/createCWSRequest/Photo", oResponse.getSource().getData().d.results[0] ?
					"data:image/png;base64," + oResponse.getSource().getData().d.results[0].photo : null);
			}.bind(component));
		},
		getAuditLogData: function (component, selectedReq, callBackFx) {
			var UtilitySrvModel = component.getComponentModel("UtilitySrvModel");
			// var staffId = component.AppModel.getProperty("/loggedInUserInfo/userName");
			var sUrl = Config.dbOperations.auditLogApi;

			var oHeaders = HeaderHelper._headerToken();

			let oParameter = {
				referenceId: selectedReq.REQUEST_ID,
				processCode: selectedReq.PROCESS_CODE
			};
			this._readDataUsingOdataModel(
				sUrl,
				UtilitySrvModel,
				component,
				[],
				function (response) {
					callBackFx(response.getAuditLogData);
				}.bind(component),
				oHeaders,
				oParameter
			);
		},
		requestUnlock: function (component, selectedReq, callBackFx) {
			// var staffId = component.AppModel.getProperty("/loggedInUserInfo/userName");
			var sUrl = Config.dbOperations.lockRelease;
			var UtilitySrvModel = component.getComponentModel("UtilitySrvModel");
			var oHeaders = HeaderHelper._headerToken();

			let oParameter = {
				draftId: selectedReq.REQ_UNIQUE_ID
			};
			this._readDataUsingOdataModel(
				sUrl,
				UtilitySrvModel,
				component,
				[],
				function (response) {
					callBackFx(response.releaseLockedRequests);
				}.bind(component),
				oHeaders,
				oParameter
			);
		},

		fetchFilterData: function (sThis, oPayload, callBackFx) {
			var sUrl = Config.dbOperations.fetchFilterLookup;
			var token = sThis.AppModel.getProperty("/token");
			var oHeaders = {
				"Content-Type": "application/json",
				"Authorization": "Bearer" + " " + token
			};

			var filterModel = new JSONModel();
			filterModel.loadData(sUrl, JSON.stringify(oPayload), null, "POST", null, null, oHeaders);
			filterModel.attachRequestCompleted(function (oResponse) {

				if (oResponse.getSource().getData() instanceof Object) {
					callBackFx(oResponse.getSource().getData());
				} else {
					callBackFx({});
				}
			}.bind(sThis));
		},
		// fetchUserImageAsync: function (sThis, staffId) {
		// 	var oPhotoModel = new JSONModel();
		// 	var sUrl = Config.dbOperations.fetchPhotoUser;
		// 	sUrl = sUrl + "?userId=" + staffId;
		// 	var token = sThis.AppModel.getProperty("/token");
		// 	var oHeaders = {
		// 		"Accept": "application/json",
		// 		"Authorization": "Bearer" + " " + token
		// 	};
		// 	oPhotoModel.loadData(sUrl, null, false, "GET", null, null, oHeaders);
		// 	return oPhotoModel.getData().d.results;
		// },
		fetchUserPhoto: function (component, callBackFx) {
			var sUrl = Config.dbOperations.photoApi;
			var staffId = component.AppModel.getProperty("/staffInfo/STAFF_ID");
			// component.AppModel.setProperty("/loggedInUserStfNumber", staffId);

			var UtilitySrvModel = component.getComponentModel("UtilitySrvModel");
			var oHeaders = HeaderHelper._headerToken();
			let oParameter = {
				userId: staffId
			};

			this._readDataUsingOdataModel(
				sUrl,
				UtilitySrvModel,
				component,
				[],
				function (response) {
					callBackFx(response?.results[0] || {});
				}.bind(component),
				oHeaders,
				oParameter
			);

		},
		// fetchTaskProcessDetails: function (sThis, objData, callBackFx) {
		// 	var oTaskProcessModel = new JSONModel();
		// 	var sUrl = Config.dbOperations.taskProcessHistoryNew;
		// 	sUrl = sUrl + objData.REQ_UNIQUE_ID + "&processCode=" + objData.PROCESS_CODE + "&requestId=" + objData.REQUEST_ID;
		// 	var token = sThis.AppModel.getProperty("/token");
		// 	var oHeaders = {
		// 		"Accept": "application/json",
		// 		"Authorization": "Bearer" + " " + token
		// 	};
		// 	oTaskProcessModel.loadData(sUrl, null, false, "GET", null, null, oHeaders);
		// 	callBackFx(oTaskProcessModel.getData());
		// },
		fetchTaskProcessDetails: async function (component, selectedReq, callBackFx) {
			var UtilitySrvModel = component.getComponentModel("UtilitySrvModel");
			var sUrl = Config.dbOperations.taskProcessHistoryNew;
			var oHeaders = HeaderHelper._headerToken();
			let oParameter = {
				draftId: selectedReq.REQ_UNIQUE_ID,
				requestId: selectedReq.REQUEST_ID,
				processCode: selectedReq.PROCESS_CODE
			};
			await this._readDataUsingOdataModel(
				sUrl,
				UtilitySrvModel,
				component,
				[],
				function (response) {
					callBackFx(response.getProcessTrackerForNewNChangeRequests);
				}.bind(component),
				oHeaders,
				oParameter
			);
		},

		persistOpwnRequest: async function (component, oPayload, callBackFx) {
			// var sUrl = Config.dbOperations.saveCwRequest;
			delete oPayload.JOIN_DATE;
			var oCont = {
				"cwRequest": []
			};
			oCont.cwRequest.push(oPayload);

			var CwsSrvModel = component.getComponentModel("CwsSrvModel");
			var serviceUrl = Config.dbOperations.massUpload;
			await this._createDataUsingOdataModelWithRespObject(
				serviceUrl,
				CwsSrvModel,
				component,
				function (response) {
					let oResponse = (response && response.data && response.data.massCwRequestsCreation) ? response.data.massCwRequestsCreation : {};
					if (!oResponse.error) {
						callBackFx(oResponse);
					} else {
						sap.m.MessageBox.error(oResponse.message);
					}

				}.bind(this),
				HeaderHelper._headerToken(),
				oCont,
				true
			);
			// var persistModel = new JSONModel();
			// persistModel.loadData(sUrl, JSON.stringify(oCont), null, "POST", null, null, oHeaders);
			// persistModel.attachRequestCompleted(function (oResponse) {
			// 	callBackFx(oResponse.getSource().getData());
			// }.bind(component));
		},

		readLookups: function (serviceUrl, oDataModel, component, aFilter, callBackFx) {
			oDataModel = oDataModel ? oDataModel : component.getComponentModel("CwsSrvModel");
			oDataModel.read(serviceUrl, {
				filters: aFilter,
				success: function (oData) {
					if (oData) {
						callBackFx(oData);
					}
				}.bind(component),
				error: function (oError) { }
			});
		},
		getRequestViewCount: function (serviceUrl, oDataModel, component, aFilter, callBackFx) {
			this._readDataUsingOdataModel(
				Config.dbOperations.requestViewCount,
				oDataModel,
				component,
				aFilter,
				function (oResponse) {
					callBackFx(oResponse);
				}.bind(this),
				HeaderHelper._headerToken(),
				{}
			);
		},
		getStatusConfig: function (component, callBackFx) {
			let oDataModel = component.getComponentModel("CatalogSrvModel");
			this._readDataUsingOdataModel(
				Config.dbOperations.statusConfig,
				oDataModel,
				component,
				[],
				function (oData) {
					callBackFx(oData);
				}.bind(this),
				HeaderHelper._headerToken(),
				{}
			);
		},

		_readDataUsingOdataModel: function (serviceUrl, oDataModel, component, aFilter, callBackFx) {
			oDataModel.read(serviceUrl, {
				filters: aFilter,
				success: function (oData) {
					if (oData) {
						callBackFx(oData);

					}
				}.bind(component),
				error: function (oError) {
					callBackFx(oError);
				}
			});
		},
		_loadDataUsingJsonModel: function (component, serviceUrl, oPayload, httpMethod, callBackFx) {
			var oModel = new JSONModel();
			var headers = Formatter._amendHeaderToken(component);
			var sPayload = null;
			if (oPayload) {
				if (httpMethod === "GET") {
					sPayload = oPayload;
				} else {
					sPayload = JSON.stringify(oPayload);
				}
			}
			oModel.loadData(serviceUrl, sPayload, null, httpMethod, null, null, headers);
			oModel.attachRequestCompleted(function (oResponse) {
				callBackFx(oResponse);
			});
		},

		_loadDataAttachment: function (serviceUrl, oPayload, httpMethod, headers, callBackFx) {
			var oModel = new JSONModel();
			var sPayload = null;
			if (oPayload) {
				if (httpMethod === "GET") {
					sPayload = oPayload;
				} else {
					sPayload = JSON.stringify(oPayload);
				}
			}
			oModel.loadData(serviceUrl, sPayload, null, httpMethod, null, null, headers);
			oModel.attachRequestCompleted(function (oResponse) {
				callBackFx(oResponse);
			});
		},
		performAttrUpdate: function (component) {
			var attachmentId = component.AppModel.getProperty("/oMassAttachmentID");
			var cwSrvModel = component.getOwnerComponent().getModel("CwsSrvModel");
			var oData = {
				"IS_ZIP_PROCESSED": "N"
			};
			var oHeaders = {
				"If-Match": "*"
			};
			// Perform the PATCH request
			cwSrvModel.update("/AttachmentsDatas('" + attachmentId + "')", oData, {
				method: "PATCH",
				headers: oHeaders,
				success: function () { },
				error: function (oError) {
					sap.m.MessageToast.show("Error occurred while updating the status flag.");
				}
			});
		},
		validateForWeekend: function (sThis) {
			var oValidateModel = new JSONModel();
			var sUrl = Config.dbOperations.weekendValidateUrl;
			var token = sThis.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token
			};
			oValidateModel.loadData(sUrl, null, false, "GET", null, null, oHeaders);
			return oValidateModel.getData();
		},
		getTotalUtilization: async function (component, oPayload, callBackFx) {
			var CwsSrvModel = component.getComponentModel("CwsSrvModel");
			var serviceUrl = Config.dbOperations.utilizationDays;
			await this._createDataUsingOdataModelWithRespObject(
				serviceUrl,
				CwsSrvModel,
				component,
				function (response) {
					let oResponse = (response && response.data && response.data.totalUtilization) ? response.data.totalUtilization : {};
					if (!oResponse.error) {
						callBackFx(oResponse);
					} else {
						sap.m.MessageBox.error(oResponse.message);
					}

				}.bind(this),
				HeaderHelper._headerToken(),
				oPayload,
				true
			);
		},
		getRequestLock: async function (component, oPayload, callBackFx) {
			var UtilitySrvModel = component.getComponentModel("UtilitySrvModel");
			var serviceUrl = Config.dbOperations.requestLock;
			await this._createDataUsingOdataModelWithRespObject(
				serviceUrl,
				UtilitySrvModel,
				component,
				function (response) {
					let oResponse = (response && response.data && response.data.requestLock) ? response.data.requestLock : {};
					if (!oResponse.error) {
						callBackFx(oResponse);
					} else {
						sap.m.MessageBox.error(oResponse.message);
					}

				}.bind(this),
				HeaderHelper._headerToken(),
				oPayload,
				true
			);
		},
		getPaymentList: async function (component, oPayload, callBackFx) {
			var CwsSrvModel = component.getComponentModel("CwsSrvModel");
			var serviceUrl = Config.dbOperations.oPaymentList;
			await this._createDataUsingOdataModelWithRespObject(
				serviceUrl,
				CwsSrvModel,
				component,
				function (response) {
					let oResponse = (response && response.data && response.data.populatePaymentList) ? response.data.populatePaymentList : {};
					if (!oResponse.error) {
						callBackFx(oResponse);
					} else {
						sap.m.MessageBox.error(oResponse.message);
					}

				}.bind(this),
				HeaderHelper._headerToken(),
				oPayload,
				true
			);
		},
		getPayrollArea: async function (component, oPayload, callBackFx) {
			var CwsSrvModel = component.getComponentModel("CwsSrvModel");
			var serviceUrl = Config.dbOperations.utilizationDays;
			await this._createDataUsingOdataModelWithRespObject(
				serviceUrl,
				CwsSrvModel,
				component,
				function (response) {
					let oResponse = (response && response.data && response.data.totalUtilization) ? response.data.totalUtilization : {};
					if (!oResponse.error) {
						callBackFx(oResponse);
					} else {
						sap.m.MessageBox.error(oResponse.message);
					}

				}.bind(this),
				HeaderHelper._headerToken(),
				oPayload,
				true
			);
		},
		validateWbs: async function (component, oPayload, callBackFx) {
			var UtilitySrvModel = component.getComponentModel("UtilitySrvModel");
			//Need to replace with the model pointing to CWSNED CAPM Application
			// var EclaimValModel = component.getComponentModel("EclaimValModel");
			var serviceUrl = Config.dbOperations.checkWbs;
			await this._createDataUsingOdataModelWithRespObject(
				serviceUrl,
				UtilitySrvModel,
				component,
				function (response) {
					if (response.success) {
						let oResponse = (response && response.data && response.data.raw) ? response.data.raw : {};
						callBackFx(oResponse);
					} else {
						sap.m.MessageBox.error(component.getI18n("CwsRequest.WbsError"));
					}

				}.bind(this),
				HeaderHelper._headerToken(),
				oPayload,
				true
			);
		},
		getTaskAgent: async function (component, oPayload, callBackFx) {
			var UtilitySrvModel = component.getComponentModel("UtilitySrvModel");
			var serviceUrl = Config.dbOperations.fetchTaskAgent;
			await this._createDataUsingOdataModelWithRespObject(
				serviceUrl,
				UtilitySrvModel,
				component,
				function (response) {
					if (response.success) {
						let oResponse = (response && response.data && response.data.results) ? response.data.results : {};
						callBackFx(oResponse);
					} else {
						sap.m.MessageBox.error(response.response.message);
					}
				}.bind(this),
				HeaderHelper._headerToken(),
				oPayload,
				true
			);
		},
		getRequestStatusDetails: function (component, reqUniqueId, requestId, callBackFx) {
			var CwsSrvModel = component.getComponentModel("CwsSrvModel");
			var sUrl = Config.dbOperations.requestDetails;

			var oHeaders = HeaderHelper._headerToken();

			let oParameter = {
				requestUniqueId: reqUniqueId,
				requestId: requestId
			};
			this._readDataUsingOdataModel(
				sUrl,
				CwsSrvModel,
				component,
				[],
				function (response) {
					callBackFx(response.results);
				}.bind(component),
				oHeaders,
				oParameter
			);
		},
		performDraftDeletion: async function (component, oPayload, callBackFx) {
			var CwsSrvModel = component.getComponentModel("CwsSrvModel");
			var serviceUrl = Config.dbOperations.deleteReqUrl;
			await this._createDataUsingOdataModelWithRespObject(
				serviceUrl,
				CwsSrvModel,
				component,
				function (response) {
					if (response.success) {
						let oResponse = (response && response.data && response.data.workFlowUserDetails) ? response.data.workFlowUserDetails : {};
						callBackFx(oResponse);
					} else {
						sap.m.MessageBox.error(response.response.message);
					}
				}.bind(this),
				HeaderHelper._headerToken(),
				oPayload,
				true
			);
		},
		_readDataUsingOdataModel: async function (
			serviceUrl,
			oDataModel,
			component,
			aFilter,
			callBackFx,
			headers,
			urlParameter = {}
		) {
			if (!urlParameter) {
				urlParameter = {};
			}
			if (!headers) {
				headers = HeaderHelper._headerToken();
			}
			var p = new Promise(function (resolve, reject) {

				oDataModel.read(serviceUrl, {
					headers: headers,
					urlParameters: urlParameter,
					filters: aFilter,
					success: function (oData) {
						resolve(oData);
					}.bind(component),
					error: function (oError) {
						reject(oError);
					}
				});
			});
			if (typeof callBackFx === "function") {
				p.then(callBackFx).catch(callBackFx);
			}
			return p;
		},
		_createDataUsingOdataModelWithRespObject: function (
			serviceUrl,
			oDataModel,
			component,
			callBackFx,
			headers,
			oPayload,
			bFramePayload = true
		) {
			let framePayload = {
				"data": oPayload
			}
			var p = new Promise(function (resolve, reject) {
				oDataModel.create(serviceUrl, framePayload, {
					headers: headers,
					success: function (oData, oResponse) {
						// Create a complete response object with data, headers, and status
						var completeResponse = {
							data: oData,
							response: oResponse,
							headers: oResponse ? oResponse.headers : {},
							status: oResponse ? oResponse.statusCode : 200,
							success: true
						};
						resolve(completeResponse);
					}.bind(component),
					error: function (oError) {
						// Create a complete error response object
						var errorResponse = {
							data: null,
							response: oError,
							headers: oError ? oError.headers : {},
							status: oError ? oError.statusCode : 500,
							success: false,
							error: oError
						};
						reject(errorResponse);
					}
				});
			});
			if (typeof callBackFx === "function") {
				p.then(callBackFx).catch(callBackFx);
			}
			return p;
		}

	};
});