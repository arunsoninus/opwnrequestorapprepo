jQuery.sap.declare("sap.m.CWSExtMultiInput");
sap.m.Input.extend("sap.m.CWSExtMultiInput", {

	metadata: {
		properties: {
			"dialogTitle": "string",
			"dialogCodeLbl": "string",
			"dialogDescLbl": "string",
			"dataPath": "string",
			"sorter": "string",
			"urlPath": "string",
			"urlAttr": "string",
			"setOnUI": "string",
			"labelCode": "string",
			"valueHelpKey": "string",
			"parameterPath": "string",
			"properties": "string",
			"modelProperties": "string",
			"tableDataPath": "string",
			"duplicates": "string",
			"amendCode": "string",

		}
	},
	renderer: "sap.m.InputRenderer",

	tableObj: "",
	sourceCallBack: "",

	openValueHelp: function (oEvent, uiTableModel, isSync, modelData, sourceType, oHeaders, callBack) {
		if (sourceType) {
			this.sourceType = sourceType;
			this.callBack = callBack;
		}
		var processUrl = oEvent.getSource().getProperty("urlPath");
		this.desc = oEvent.getSource().getProperty("dialogDescLbl");
		this.code = oEvent.getSource().getProperty("dialogCodeLbl");
		this.valueId = oEvent.getParameter("id");
		this.dataPath = oEvent.getSource().getProperty("dataPath");
		this.duplicates = oEvent.getSource().getProperty("duplicates");
		this.amendCode = oEvent.getSource().getProperty("amendCode");
		var loadDataModel = this.createJSONModelWithURL(processUrl, isSync, modelData, oHeaders);

		this.setOnUI = oEvent.getSource().getProperty("setOnUI");
		this.labelCode = oEvent.getSource().getProperty("labelCode");
		//If invoked from a Table
		if (uiTableModel) {
			this.tableObj = {
				"dataModel": uiTableModel,
				"dataProperties": oEvent.getSource().getProperties(),
				"modelProperties": oEvent.getSource().getModelProperties(),
				"sPath": oEvent.getSource().getTableDataPath()
			};
		}

		var that = this;

		this.valueHelpDialog = new sap.m.SelectDialog({
			title: oEvent.getSource().getProperty("dialogTitle"),
			searchPlaceholder: that.desc === "STF_NUMBER" ? "Enter Emp No." : "",
			liveChange: function (liveChangeEvt) {
				that.searchHelp(liveChangeEvt);
			},
			close: function (closeEvt) {
				that.handleClose(closeEvt);
			},
			confirm: function (confirmEvt) {
				that.handleClose(confirmEvt);
				if (that.sourceType) {
					that.callBack(that.resultObj);
				}
			},
			items: {
				path: that.dataPath,
				template: new sap.m.StandardListItem({
					title: {
						path: that.code,
						formatter: function (code) {
							return code ? code : "";
						}
					},
					description: {
						path: that.desc,
						formatter: function (code) {
							return that.desc === "STF_NUMBER" ? "" : code;
						}
					}
				}),
				sorter: new sap.ui.model.Sorter(that.code)
			}
		});
		this.valueHelpDialog.setModel(loadDataModel);
		this.valueHelpDialog.open();

		this.valueHelpDialog.addStyleClass("sapUiSizeCompact");
		this.valueHelpDialog.setBusy(isSync);

		return loadDataModel.getData();
	},
	destroyValueHelp: function () {
		if (this.valueHelpDialog != null) {
			this.valueHelpDialog.destroy();
		}
	},

	searchHelp: function (oEvent) {
		var sValue = oEvent.getParameter("value");
		var oFilter = new sap.ui.model.Filter(this.desc, sap.ui.model.FilterOperator.Contains, sValue);
		var oFilter1 = new sap.ui.model.Filter(this.code, sap.ui.model.FilterOperator.Contains, sValue);
		var oBinding = oEvent.getSource().getBinding("items");
		oBinding.filter(new sap.ui.model.Filter([oFilter, oFilter1]), false);
	},

	handleClose: function (oEvent) {
		var aContexts = oEvent.getParameter("selectedContexts");
		var resultObj = {};
		if (aContexts.length) {
			aContexts.map(function (oContext) {
				resultObj = (oContext.getObject()) ? oContext.getObject() : {};
			});
		}

		if (resultObj) {
			if (this.tableObj) {
				var tempObj = this.tableObj;
				var bindingProp = tempObj.dataProperties;
				var modelProp = tempObj.modelProperties;
				if (bindingProp && modelProp) {
					bindingProp = bindingProp.split(",");
					modelProp = modelProp.split(",");
					if (bindingProp.length === modelProp.length) {
						var tableModel = tempObj.dataModel;
						var path = tempObj.sPath;
						for (var i = 0; i < bindingProp.length; i++) {
							tableModel.setProperty(path + "/" + bindingProp[i], resultObj[modelProp[i]]);
						}
					}
				}
			} else {
				var tempInput = sap.ui.getCore().byId(this.valueId);
				tempInput.setTooltip(resultObj[this.setOnUI]);
				tempInput.setValue(resultObj[this.setOnUI]);

				var tempLabelCode = sap.ui.getCore().byId(this.labelCode);
				if (tempLabelCode) {
					tempLabelCode.setText(resultObj[this.code]);
				}

			}
		}
		this.resultObj = resultObj;
	},

	createJSONModelWithURL: function (jsonURL, isSync, modelData, oHeaders) {
		var oModel = new sap.ui.model.json.JSONModel();
		if (modelData) {
			oModel.setData(modelData);
			// this.includeEmptyLineItem(oModel);
		} else {
			oModel.loadData(jsonURL, null, isSync, "GET", null, null, oHeaders);
		}

		if (this.duplicates === "merge") {
			var tempList = oModel.getProperty(this.dataPath);
			if (tempList instanceof Array) {
				var tempObj = {};
				var newList = [];
				for (var i = 0; i < tempList.length; i++) {
					if (!tempObj[tempList[i][this.desc]]) {
						tempObj[tempList[i][this.desc]] = tempList[i][this.code];
						newList.push(tempList[i]);
					}
				}
			}
			oModel.setProperty(this.dataPath, newList);
		}

		// if (isSync) {
		var that = this;
		oModel.attachRequestCompleted(function () {
			if (that.amendCode) {
				that.formatProperties(oModel);
			}
		});
		// }
		return oModel;

	},
	formatProperties: function (oModel) {
		var dataList = oModel.getProperty(this.dataPath);
		var that = this;
		var formattedList = [];
		var tempMap = {};
		jQuery.sap.each(dataList, function (i) {
			dataList[i][that.desc] = dataList[i][that.desc] + " (" + dataList[i][that.amendCode] + ")";
			// Remove Duplicate Values
			if (!tempMap[dataList[i][that.amendCode]]) {
				tempMap[dataList[i][that.amendCode]] = dataList[i][that.amendCode];
				formattedList.push(dataList[i]);
			}
		});
		this.valueHelpDialog.setBusy(false);
		oModel.setProperty(this.dataPath, formattedList);
	},

	includeEmptyLineItem: function (oModel) {
		var tempList = oModel.getProperty(this.dataPath);
		var tempElement = {};
		tempElement[this.desc] = "";
		tempElement[this.code] = "";
		tempList.unshift(tempElement);
		oModel.setProperty(this.dataPath, tempList);
	}

});