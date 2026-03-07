jQuery.sap.declare("sap.m.MatrixMultiInputOData");
sap.m.Input.extend("sap.m.MatrixMultiInputOData", {

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
            "loadOnSearch": "string",
            "additionalParams": "string"

        }
    },
    renderer: "sap.m.InputRenderer",

    tableObj: "",
    sourceCallBack: "",

    openValueHelp: function (oEvent, uiTableModel, dataSrcModel, lookupFilters, noInitialLoad, modelData, sourceType, callBack) {
        if (sourceType) {
            this.sourceType = sourceType;
            this.callBack = callBack;
        }
        var processUrl = oEvent.getSource().getProperty("urlPath");
        this.processUrl = processUrl;
        this.desc = oEvent.getSource().getProperty("dialogDescLbl");
        this.code = oEvent.getSource().getProperty("dialogCodeLbl");
        this.valueId = oEvent.getParameter("id");
        this.dataPath = oEvent.getSource().getProperty("dataPath");
        this.duplicates = oEvent.getSource().getProperty("duplicates");
        this.amendCode = oEvent.getSource().getProperty("amendCode");
        this.loadOnSearch = oEvent.getSource().getProperty("loadOnSearch");
        // this.oHeaders = oHeaders;
        this.additionalParams = oEvent.getSource().getProperty("additionalParams");
        this.dialogTitle = oEvent.getSource().getProperty("dialogTitle");

        if (this.loadOnSearch) {
            this.dataSrcModel = dataSrcModel;
        }

        this._readDataUsingOdataModel(this.processUrl, modelData, dataSrcModel, lookupFilters,false,
            function (dataModel) {
                this.setDataToLookupDialog(dataModel);
            }.bind(this));

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
    },
    setDataToLookupDialog: function (lookupDataModel) {
        var that = this;
        this.valueHelpDialog = new sap.m.SelectDialog({
            title: this.dialogTitle,
            liveChange: function (liveChangeEvt) {
                that.searchHelp(liveChangeEvt);
            },
            search: function (liveChangeEvt) {
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
                template: new sap.m.StandardListItem().bindProperty("title", that.code).bindProperty(
                    "description", that.desc)
            }
        });
        this.valueHelpDialog.setModel(lookupDataModel);
        this.valueHelpDialog.open();

        this.valueHelpDialog.addStyleClass("sapUiSizeCompact");
        this.valueHelpDialog.setBusy((!this.loadOnSearch) ? isSync : false);

        return lookupDataModel.getData();
    },
    destroyValueHelp: function () {
        if (this.valueHelpDialog != null) {
            this.valueHelpDialog.destroy();
        }
    },

    searchHelp: function (oEvent) {
        var sValue = oEvent.getParameter("value");
        if (!this.loadOnSearch) {
            var oFilter = new sap.ui.model.Filter(this.desc, sap.ui.model.FilterOperator.Contains, sValue);
            var oFilter1 = new sap.ui.model.Filter(this.code, sap.ui.model.FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter(new sap.ui.model.Filter([oFilter, oFilter1]), false);
        } else {
            this.handleManualSearch(sValue);
        }
    },
    handleManualSearch: function (sValue) {
        if (sValue && sValue.trim().length > 2 && this.dataSrcModel) {
            var searchParams = (this.loadOnSearch) ? this.loadOnSearch.split(",") : [];
            var searchFilter = [], lookupFilter = [];
            jQuery.sap.each(searchParams, function (i, filterParam) {
                searchFilter.push(new sap.ui.model.Filter(filterParam, sap.ui.model.FilterOperator.Contains, sValue));
            }.bind(this));
            lookupFilter.push(new sap.ui.model.Filter(searchFilter, false));
            this.valueHelpDialog.setBusy(true);
            this._readDataUsingOdataModel(this.processUrl, null, this.dataSrcModel, lookupFilter,true,
                function (dataModel) {
                    this.valueHelpDialog.setModel(dataModel);
                    this.valueHelpDialog.addStyleClass("sapUiSizeCompact");
                    this.valueHelpDialog.setBusy(false);
                    // return dataModel.getData();
                }.bind(this));
        }
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

    createJSONModelWithURL: function (serviceUrl, isSync, modelData, isManual) {
        var oModel = new sap.ui.model.json.JSONModel();

        if (!this.loadOnSearch || isManual) {
            if (modelData) {
                oModel.setData(modelData);
                // this.includeEmptyLineItem(oModel);
            } else {
                oModel.loadData(serviceUrl, null, isSync, "GET", null, null, this.oHeaders);
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
        }


        return oModel;

    },
    formatProperties: function (oModel, odataResponse) {
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
    mergeDuplicates: function (oModel) {
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
    },

    _readDataUsingOdataModel: async function (serviceUrl, modelData, oDataModel, lFilter, isManualSearch, callBackFx) {
        var urlParameter = {};
        if (this.additionalParams) {
            urlParameter = {
                "$select": this.additionalParams
            }
        }

        var p = new Promise(function (resolve, reject) {
            var lookupModel = new sap.ui.model.json.JSONModel();
            if(this.loadOnSearch && !isManualSearch){
                resolve(lookupModel);
            }else if (modelData) {
                lookupModel.setData(modelData);
                resolve(lookupModel);
            } else {
                oDataModel.read(serviceUrl, {
                    // headers: this.oHeaders,
                    urlParameters: urlParameter,
                    filters: lFilter,
                    success: function (oData) {
                        // var oModel = new sap.ui.model.json.JSONModel();
                        lookupModel.setData(oData);

                        if (this.duplicates === "merge") {
                            this.mergeDuplicates(lookupModel);
                        }

                        if (this.amendCode) {
                            this.formatProperties(lookupModel);
                        }
                        resolve(lookupModel);
                    }.bind(this),
                    error: function (oError) {
                        reject(oError);
                    }
                });
            }
        }.bind(this));
        if (typeof callBackFx === "function") {
            p.then(callBackFx).catch(callBackFx);
        }
        return p;
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