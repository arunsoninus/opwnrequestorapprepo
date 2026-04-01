sap.ui.define([
	"./services"
], function (Services) {
	"use strict";
	var processInstanceFlow = ("nus.edu.sg.opwrequest.utils.processInstanceFlow", {

		_onPressProcessInstance: async function (oEvent, component) {
			// component.showBusyIndicator();
			var sPath = oEvent.getSource().getBindingContext("OpwnSrvModel").getPath();
			var selectedReq = component.getComponentModel("OpwnSrvModel").getProperty(sPath);
			if (!component._oProcessInstanceNode) {
				component._oProcessInstanceNode = sap.ui.xmlfragment(component.createId("fragProcessInstanceNodeTest"),
					"nus.edu.sg.opwrequest.view.fragments.TaskApprovalProcessFlow", component);
				component.getView().addDependent(component._oProcessInstanceNode);
				// sap.ui.core.Fragment.byId(component.createId("fragExistingPromotion"), "tblExistingPromotion").setModel(
				// 	"ExistingPromotionModel");
				component._oProcessInstanceNode.setEscapeHandler(function () {
					return;
				});
			}
			//component.leaveDetails();
			component.AppModel.setProperty("/processFlowRequestID", selectedReq.REQUEST_ID);
			await this._fnFrameProcessData(component,selectedReq);
			// component._oProcessInstanceNode.open();
		},
		_fnFrameProcessData: async function (component, selectedReq) {
			// component.showBusyIndicator();
			component.AppModel.setProperty("/processFlowRequestID", selectedReq.REQUEST_ID);
			await Services.fetchTaskProcessDetails(component, selectedReq, function (oResponse) {
				var aSortedKeys = Object.keys(oResponse.changeHistoryMap).sort(
					(a, b) => {
						if (b[4] === "M" && a[4] === "M") {
							return b.slice(5, 15) - a.slice(5, 15)
						} else if (b[4] !== "M" && a[4] === "M") {
							return b.slice(4, 14) - a.slice(5, 15)
						} else if (b[4] === "M" && a[4] !== "M") {
							return b.slice(5, 15) - a.slice(4, 14)
						} else {
							return b.slice(4, 14) - a.slice(4, 14)
						}
					}),
					ochangeHistoryMap = {};
				aSortedKeys.forEach(key => {
					ochangeHistoryMap[key] = oResponse.changeHistoryMap[key];
				});
				var oFlowProcess = Object.keys(ochangeHistoryMap).map(function (key) {
					var aNodes = [];
					var aLanes = [];
					var taskUserList = [];
					var aData = oResponse.requestMap[key];
					component.AppModel.setProperty("/processNode/mapData", aData);
					var taskHistoryList = oResponse.changeHistoryMap[key];

					// code to populate aNodes and aLanes arrays
					for (var t = 0; t < taskHistoryList.length; t++) {
						var objNodes = {};
						objNodes.id = "N00" + taskHistoryList[t].TASK_POSITION;
						objNodes.lane = ("L00" + taskHistoryList[t].TASK_POSITION).toString();
						objNodes.COMPLETED_BY_FULL_NAME = taskHistoryList[t].TASK_USER_FULLNAME ? taskHistoryList[t].TASK_USER_FULLNAME :
							"";
						var sDelegateToFullName = "Delegated to - " + taskHistoryList[t].DELEGATED_TO_FULLNAME;
						objNodes.DELEGATED_TO_FULLNAME = taskHistoryList[t].DELEGATED_TO_FULLNAME ? sDelegateToFullName :
							"";
						if (taskHistoryList[t].TASK_ACTUAL_DOC) {
							var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
								pattern: "d MMM, yyyy HH:mm"
							});
							var taskActualCompletionDate = oDateFormat.format(new Date(taskHistoryList[t].TASK_ACTUAL_DOC));
							objNodes.nodeText = objNodes.COMPLETED_BY_FULL_NAME + "(" + taskActualCompletionDate + ")";
							objNodes.taskActualCompletionFormatted = taskActualCompletionDate;
						} else {
							objNodes.nodeText = objNodes.COMPLETED_BY_FULL_NAME;
						}
						objNodes.texts = taskHistoryList[t].TASK_ASSGN_GRP;
						objNodes.focused = false;
						if (taskHistoryList[t].TASK_POSITION === taskHistoryList.length) {
							objNodes.children = [];
						} else {
							objNodes.children = ["N00" + (taskHistoryList[t].TASK_POSITION + 1)];
						}

						var objLanes = {
							"id": objNodes.lane,
							"position": taskHistoryList[t].TASK_POSITION - 1,
							"icon": taskHistoryList[t].TASK_ICON_TYPE ? taskHistoryList[t].TASK_ICON_TYPE : "sap-icon://pending",
							"text": taskHistoryList[t].TASK_NAME ? taskHistoryList[t].TASK_NAME : ""
						};
						objLanes.text = taskHistoryList[t].TASK_ALIAS_NAME;

						if (taskHistoryList[t].TASK_STATUS === "Active") {
							objLanes.state = [{
								"state": "Critical",
								"value": 100
							}];
							objNodes.state = "Critical";
						} else if (taskHistoryList[t].TASK_STATUS === "Completed") {
							if (taskHistoryList[t].ACTION_CODE === 'REJECT') {
								objLanes.state = [{
									"state": "Negative",
									"value": 100
								}];
								objNodes.state = "Negative";
							} else {
								objLanes.state = [{
									"state": "Positive",
									"value": 100
								}];
								objNodes.state = "Positive";
							}

						} else if (taskHistoryList[t].TASK_STATUS === "Rejected") {
							objLanes.state = [{
								"state": "Negative",
								"value": 100
							}];
							objNodes.state = "Negative";
						}
						if (taskHistoryList[t].TASK_NAME === "CW_ESS") {
							objLanes.state = [{
								"state": "Positive",
								"value": 100
							}];
							objNodes.state = "Positive";
						}

						// fetch image
						if (taskHistoryList[t].TASK_USER_STAFF_ID && taskHistoryList[t].TASK_USER_STAFF_ID !== "ALL") {
							var photoResponse = Services.fetchUserImageAsync(component, taskHistoryList[t].TASK_USER_STAFF_ID);
							if (photoResponse.length) {
								objNodes.src = "data:image/png;base64," + photoResponse[0].photo;
							} else {
								objNodes.src = sap.ui.require.toUrl("nus/edu/sg/opwrequest/Image/Empty.png");
							}
						} else {
							objNodes.src = sap.ui.require.toUrl("nus/edu/sg/opwrequest/Image/Empty.png");
						}

						if (taskHistoryList[t].taskUserList) {
							taskUserList.push(taskHistoryList[t].taskUserList);
						}

						aLanes.push(objLanes);
						aNodes.push(objNodes);

					}
					return {
						nodes: aNodes,
						lanes: aLanes,
						mapData: aData,
						userList: taskUserList[0]
					};
				});

				component.AppModel.setProperty("/oFlowProcess", oFlowProcess);
				component._oProcessInstanceNode.open();
				component.hideBusyIndicator();
			}.bind(component));

		},
		_onPressCloseProcessNode: function (component) {
			component._oProcessInstanceNode.close();
			component._oProcessInstanceNode.getContent().forEach(function (node) {
				node.destroyContent();
			});
			component._oProcessInstanceNode.destroy();
			component._oProcessInstanceNode = null;
			component._oProcessInstanceNode = undefined;
		}
	});
	return processInstanceFlow;
}, true);