sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device",
	"./configuration", "./dataformatter"
], function (JSONModel, Device, Config, Formatter) {
	"use strict";

	return {

		fetchLoggedUserToken: function (sThis, callBackFx) {
			var that = this;
			var userModel = new JSONModel();
			userModel.loadData("/services/userapi/currentUser", null, false);
			sap.ui.getCore().setModel(userModel, "userapi");
			userModel.dataLoaded().then(function () {
				var sUserName = sap.ui.getCore().getModel("userapi").getData().name;
				// sUserName = '<username for debug>';
				sThis.AppModel.setProperty("/loggedInUserId", sUserName);
				that._getUserDetails(sThis, sUserName, callBackFx);
			}.bind(sThis));
		},
		_getUserDetails: function (sThis, sUserName, callBackFx) {
			try {
				var oHeaders = {
					"Content-Type": "application/json"
				};
				var Payload = {
					"userName": sUserName
				};

				var authModel = new JSONModel();
				authModel.loadData(Config.dbOperations.authorizeTokenNew, JSON.stringify(Payload), null, "POST", null, null, oHeaders);
				authModel.attachRequestCompleted(function (oResponse) {
					var tokenDetails = oResponse.getSource().getData();
					var userDetails = this.getUserInfoDetails(tokenDetails.token);
					Object.assign(userDetails, tokenDetails);
					callBackFx(userDetails);
				}, this);
			} catch (e) {
				sap.m.MessageToast.show("Service temporarily down for maintenance. Excuse us for the inconvenience.");
			}
		},
		getLoggedInUserToken: function (sUserName) {
			var oHeaders = {
				"Content-Type": "application/json"
			};
			var Payload = {
				"userName": sUserName
			};
			var authModel = new JSONModel();
			authModel.loadData(Config.dbOperations.authorizeTokenNew, JSON.stringify(Payload), null, "POST", null, null, oHeaders);
			authModel.attachRequestCompleted(function (oResponse) {
				callBackFx(oResponse.getSource().getData().token);
			}, this);

			// var authModel = new JSONModel();
			// authModel.loadData(Config.dbOperations.authorizeToken + sUserName, null, false, "GET", false, false);
			// return authModel.getData();
		},
		getUserInfoDetails: function (userToken) {
			var userInfoModel = new JSONModel();
			var oHeaders = Formatter._amendHeaderToken(null, userToken);
			userInfoModel.loadData(Config.dbOperations.userDetails, null, false, "GET", false, false, oHeaders);
			return userInfoModel.getData();
		},
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

		fetchPhotoOfUser: function (sThis, staffId) {
			var oPhotoModel = new JSONModel();
			var sUrl = Config.dbOperations.fetchPhotoUser;
			sUrl = sUrl + "?userId=" + staffId;
			var token = sThis.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token
			};
			oPhotoModel.loadData(sUrl, null, null, "GET", null, null, oHeaders);
			oPhotoModel.attachRequestCompleted(function (oResponse) {
				sThis.AppModel.setProperty("/cwsRequest/createCWSRequest/Photo", oResponse.getSource().getData().d.results[0] ?
					"data:image/png;base64," + oResponse.getSource().getData().d.results[0].photo : null);
			}.bind(sThis));
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
		fetchUserImageAsync: function (sThis, staffId) {
			var oPhotoModel = new JSONModel();
			var sUrl = Config.dbOperations.fetchPhotoUser;
			sUrl = sUrl + "?userId=" + staffId;
			var token = sThis.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token
			};
			oPhotoModel.loadData(sUrl, null, false, "GET", null, null, oHeaders);
			return oPhotoModel.getData().d.results;
		},
		fetchTaskProcessDetails: function (sThis, objData, callBackFx) {
			var oTaskProcessModel = new JSONModel();
			var sUrl = Config.dbOperations.taskProcessHistoryNew;
			sUrl = sUrl + objData.REQ_UNIQUE_ID + "&processCode=" + objData.PROCESS_CODE + "&requestId=" + objData.REQUEST_ID;
			var token = sThis.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token
			};
			oTaskProcessModel.loadData(sUrl, null, false, "GET", null, null, oHeaders);
			callBackFx(oTaskProcessModel.getData());
		},

		persistCwsRequest: function (component, oHeaders, oPayload, callBackFx) {
			// var sUrl = Config.dbOperations.saveCwRequest;
			var sUrl = Config.dbOperations.massUpload;
			delete oPayload.JOIN_DATE;
			var oCont = {
				"cwRequest": []
			};
			oCont.cwRequest.push(oPayload);
			var persistModel = new JSONModel();
			persistModel.loadData(sUrl, JSON.stringify(oCont), null, "POST", null, null, oHeaders);
			persistModel.attachRequestCompleted(function (oResponse) {
				callBackFx(oResponse.getSource().getData());
			}.bind(component));
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
				error: function (oError) {}
			});
		},
		getRequestViewCount: function (serviceUrl, oDataModel, component, aFilter, callBackFx) {
			oDataModel.read(serviceUrl, {
				filters: aFilter,
				success: function (oData) {
					if (oData) {
						callBackFx(oData);

					}
				}.bind(component),
				error: function (oError) {}
			});
		},
		getStatusConfig: function (serviceUrl, oDataModel, component, callBackFx) {
			oDataModel.read(serviceUrl, {
				success: function (oData) {
					if (oData) {
						return callBackFx(oData);
					}
				}.bind(component),
				error: function (oError) {}
			});
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
				success: function () {},
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
		}

	};
});