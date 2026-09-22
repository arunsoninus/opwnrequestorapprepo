sap.ui.define([], function () {
    "use strict";

    return {
        _headerToken: function () {
            var oHeaders = {
				"Accept": "application/json",
				"AccessPoint": "A",
				"x-app-id": "nus.edu.sg.opwrequest",
				"Content-Type": "application/json"
			};
			var currentURL = window.location.href;
			var searchString = "applicationstudio";
			if (currentURL.includes(searchString)) {
				// oHeaders["X-User-Id"] = 'gmssawh';
				// oHeaders["X-User-Id"] = 'alvinfoo';
				// oHeaders["X-User-Id"] = 'FANDI.C';
				// oHeaders["X-User-Id"] = 'arunsoni';
			}
			return oHeaders;
        }
    };
});
