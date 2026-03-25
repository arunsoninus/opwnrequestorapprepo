sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"nus/edu/sg/opwrequest/model/models",
	"sap/f/FlexibleColumnLayoutSemanticHelper"
], function (UIComponent, Device, JSONModel, models, FlexibleColumnLayoutSemanticHelper) {
	"use strict";

	return UIComponent.extend("nus.edu.sg.opwrequest.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			var oModel = new JSONModel();
			this.setModel(oModel);

			// enable routing
			var oRouter = this.getRouter();
			oRouter.attachBeforeRouteMatched(this._onBeforeRouteMatched, this);
			oRouter.initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
		},
		getHelper: function () {
			return this._getFcl().then(function (oFCL) {
				var oSettings = {
					defaultTwoColumnLayoutType: "TwoColumnsMidExpanded",
					defaultThreeColumnLayoutType: "ThreeColumnsMidExpanded"
				};
				return (FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings));
			});
		},
		/**
		 * Make the UI Elements in compact size
		 */
		getContentDensityClass: function () {
			if (!this._sContentDensityClass) {
				// if (!Device.support.touch) {
				if (Device.support.touch) {
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		},
		_onBeforeRouteMatched: function (oEvent) {
			var oModel = this.getModel(),
				sLayout = oEvent.getParameters().arguments.layout,
				oNextUIState;

			// If there is no layout parameter, query for the default level 0 layout (normally OneColumn)
			if (!sLayout) {
				this.getHelper().then(function (oHelper) {
					oNextUIState = oHelper.getNextUIState(0);
					oModel.setProperty("/layout", oNextUIState.layout);
				});
				return;
			}

			oModel.setProperty("/layout", sLayout);
		},
		_getFcl: function () {
			return new Promise(function (resolve, reject) {
				var oFCL = this.getRootControl().byId('opwFlexibleColumnLayout');
				if (!oFCL) {
					this.getRootControl().attachAfterInit(function (oEvent) {
						resolve(oEvent.getSource().byId('opwFlexibleColumnLayout'));
					}, this);
					return;
				}
				resolve(oFCL);

			}.bind(this));
		}
	});
});