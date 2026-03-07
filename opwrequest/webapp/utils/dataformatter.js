sap.ui.define([],
	function () {
		return {

			attachmentIconSet: function (sType) {
				sType = (sType.split("."))[1];
				switch (sType) {
				case "jpg":
					return "sap-icon://attachment-photo";
					break;
				case "jpeg":
					return "sap-icon://attachment-photo";
					break;
				case "png":
					return "sap-icon://attachment-photo";
					break;
				case "pdf":
					return "sap-icon://pdf-attachment";
					break;
				case "xls":
					return "sap-icon://excel-attachment";
					break;
				case "xlsx":
					return "sap-icon://excel-attachment";
					break;
				case "doc":
					return "sap-icon://documents";
					break;
				case "docx":
					return "sap-icon://documents";
					break;
				case "ppt":
				case "pptx":
					return "sap-icon://ppt-attachment";
					break;
				case "txt":
					return "sap-icon://attachment-text-file";
					break;
				default:
					return "sap-icon://doc-attachment";
				}
			},

			//visibleCopy
			visibleCopy: function (tab, date, migrate) {
				var oDate = new Date(date);
				if (tab === "Post" && oDate.getFullYear() > '2021' && (migrate === "MC" || migrate === "MG")) {
					return true;
				} else if (tab === "Post" && migrate === "") {
					return true;
				} else {
					return false;
				}
			},
			/**
			 * Handle Copy Button Visibility
			 */
			handleCopyBtnVisibility: function (selectedTab, reqEndDate, migrate, reqStaffId, inboxApproverMatrix, loggedInStaffId) {
				var oDate = new Date(reqEndDate);
				var isCopyVisible = false;
				var tempFlag = false;
				if (selectedTab === "Post") {
					jQuery.sap.each(inboxApproverMatrix, function (i, aElement) {
						if (aElement.STAFF_USER_GRP === "CW_PROGRAM_ADMIN" && aElement.PROCESS_CODE === "203" && (reqStaffId !== loggedInStaffId)) {
							tempFlag = true;
						}
					});

					if (tempFlag && oDate.getFullYear() > '2021' && (migrate === "MC" || migrate === "MG")) {
						isCopyVisible = true;
					} else if (tempFlag && migrate === "") {
						isCopyVisible = true;
					}
				}
				return isCopyVisible;
			},

			attachmentLink: function (type) {
				type = (type.split("."))[1].toUpperCase();
				if (type === "PNG" || type === "JPG" || type === "JPEG" || type === "PDF") {
					return true;
				} else {
					return false;
				}
			},

			attachmentLinkv: function (type) {
				type = (type.split("."))[1].toUpperCase();
				if (type === "PNG" || type === "JPG" || type === "JPEG" || type === "PDF") {
					return false;
				} else {
					return true;
				}
			},

			/**
			 * Prepare Filtering Data
			 */
			prepareFilteringData: function (dataSet, element, customerMap) {
				dataSet.InvoiceList = (dataSet.InvoiceList instanceof Array) ? dataSet.InvoiceList : [];
				dataSet.CustomerList = (dataSet.CustomerList instanceof Array) ? dataSet.CustomerList : [];
				if (element.invoiceNumber) {
					dataSet.InvoiceList.push({
						"invoiceNumber": element.invoiceNumber
					});

				}

				//Prepare Customer List for Filter
				if (element.customerCode && !customerMap[element.customerCode]) {
					dataSet.CustomerList.push({
						"customerCode": element.customerCode,
						"customerName": element.customerName
					});
					customerMap[element.customerCode] = element.customerCode;
				}
			},

			/**
			 * Format Credit Limit Company Details
			 */
			formatCreditLimitNCompanyDetails: function (sourceType, result, oData) {
				oData = (oData.results instanceof Array) ? oData.results[0] : oData;
				Object.assign(result, oData);
			},
			formatRowElement: function (rowElement) {
				var tempEntry = {};
				for (var key in rowElement) {
					if (rowElement.hasOwnProperty(key)) {
						tempEntry[this.removeUnwantedChars(key)] = (rowElement[key]) ? rowElement[key] : "";
					}
				}
				return tempEntry;
			},
			/**
			 * Remove Unwanted Characters from an attribute
			 */
			removeUnwantedChars: function (attr) {
				attr = (attr) ? attr : "";
				attr = attr.replace(" ", "").replace("\r", "").replace("\n", "").replace(/(<([^>]+)>)/ig, "").replace("&nbsp;", "");
				while (attr.indexOf(" ") > -1 || attr.indexOf("\r") > -1 || attr.indexOf("\n") > -1 ||
					attr.indexOf("-") > -1 || attr.indexOf(".") > -1 || attr.indexOf("/") > -1 || attr.indexOf("(") > -1 || attr.indexOf("%") > -1 ||
					attr.indexOf(")") > -1) {
					attr = attr.replace(" ", "").replace("\r", "").replace("\n", "").replace("-", "").replace(".", "").replace("/", "").replace("(",
						"").replace("%", "").replace(")", "");
				}

				return attr;
			},
			/**
			 * Remove Special Characters from Amount
			 */
			removeSpecialCharsFromAmount: function (attr) {
				attr = (attr) ? attr : "";
				while (attr.indexOf(",") > -1) {
					attr = attr.replace(",", "");
				}
				return attr;
			},
			/**
			 * Remove Unwanted Characters from an attribute
			 */
			formatLineItemDesc: function (attr) {
				attr = (attr) ? attr : "";
				while (attr.indexOf("&nbsp;") > -1 || attr.indexOf("nbsp;") > -1 || attr.indexOf("&amp;") > -1 || attr.indexOf("amp;") > -1 || attr
					.indexOf(
						"&") > -1) {
					attr = attr.replace("&nbsp;", "").replace("nbsp;", "").replace("&amp;", "and").replace("amp;", "").replace("&", "and");
				}
				return attr;
			},
			/**
			 * Remove Unwanted Characters from an attribute
			 */
			formatLineItemDescPO: function (attr) {
				attr = (attr) ? attr : "";
				while (attr.indexOf("&nbsp;") > -1 || attr.indexOf("nbsp;") > -1 || attr.indexOf("&amp;") > -1 || attr.indexOf("amp;") > -1 || attr
					.indexOf(
						"&") > -1) {
					attr = attr.replace("&nbsp;", "").replace("nbsp;", "").replace("&amp;", "and").replace("amp;", "").replace("&", "and");
				}

				var isDiv = false;
				while (attr.indexOf("<div>") > -1 || attr.indexOf("</div>") > -1) {
					isDiv = true;
					attr = attr.replace("<div>", "").replace("</div>", "<br/>");
				}
				attr = (isDiv) ? ("<p>" + attr + "</p>") : attr;

				return attr;
			},

			/**
			 * Remove Unwanted Characters from an attribute
			 */
			removeUnwantedCharsForBillingRequest: function (attr) {
				attr = (attr) ? attr : "";
				attr = attr.replace(/(<([^>]+)>)/ig, "").replace("&nbsp;", "");
				while (attr.indexOf("\r") > -1 || attr.indexOf("\n") > -1 ||
					attr.indexOf("-") > -1 || attr.indexOf("/") > -1 || attr.indexOf("%") > -1 || attr.indexOf("&nbsp;") > -1 || attr.indexOf("&amp;") >
					-1) {
					attr = attr.replace("\r", ";").replace("\n", ";").replace("-", "").replace("/", "").replace("%", "").replace("&nbsp;", "").replace(
						"&amp;", " and ");
				}

				return attr;
			},

			validateDataInModels: function (model, data) {
				var obj = (model) ? model.getData() : data;
				var isLoaded = (obj && Object.keys(obj).length > 0) ? true : false;
				return isLoaded;
			},
			/***
			 * Extract and Frame Task Context Data
			 */
			hexToBase64: function (str) {
				return btoa(String.fromCharCode.apply(null, str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(
					" ")));
			},
			/*
			 * Format Date as String
			 */
			formatDateAsString: function (dateValue, format, isYearFormat) {
				var response = "";
				if (dateValue !== "NA" && dateValue !== "/Date(0)/") {
					if (dateValue) {
						if (typeof (dateValue) === "string" && dateValue.indexOf("/Date") > -1) {
							dateValue = parseFloat(dateValue.substr(dateValue.lastIndexOf("(") + 1, dateValue.lastIndexOf(")") - 1));
						}
						dateValue = new Date(dateValue);
					} else {
						dateValue = new Date();
					}

					//Format Year
					var yyyy = dateValue.getFullYear() + "";
					var tempDateStr = new Date().getFullYear();
					if (isYearFormat && (parseInt(yyyy) < tempDateStr)) {
						yyyy = tempDateStr.toString().substring(0, 2) + yyyy.substring(2, yyyy.length);
					}
					var mm = (dateValue.getMonth() + 1) + "";
					mm = (mm.length > 1) ? mm : "0" + mm;
					var dd = dateValue.getDate() + "";
					dd = (dd.length > 1) ? dd : "0" + dd;

					var hh, mins, secs;

					switch (format) {
					case "yyyyMMdd":
						response = yyyy + mm + dd;
						break;
					case "dd/MM/yyyy":
						response = dd + "/" + mm + "/" + yyyy;
						break;
					case "yyyy-MM-dd":
						response = yyyy + "-" + mm + "-" + dd;
						break;
					case "yyyy-dd-MM":
						response = yyyy + "-" + dd + "-" + mm;
						break;
					case "MM/dd/yyyy":
						response = mm + "/" + dd + "/" + yyyy;
						break;
					case "MM/yyyy":
						response = mm + "/" + yyyy;
						break;
					case "yyyy-MM-ddThh:MM:ss":
						hh = dateValue.getHours() + "";
						hh = (hh.length > 1) ? hh : "0" + hh;
						mins = dateValue.getMinutes() + "";
						mins = (mins.length > 1) ? mins : "0" + mins;
						secs = dateValue.getSeconds() + "";
						secs = (secs.length > 1) ? secs : "0" + secs;
						response = yyyy + "-" + mm + "-" + dd + "T" + hh + ":" + mins + ":" + secs;
						break;
					case "yyyy-MM-dd hh:MM:ss":
						hh = dateValue.getHours() + "";
						hh = (hh.length > 1) ? hh : "0" + hh;
						mins = dateValue.getMinutes() + "";
						mins = (mins.length > 1) ? mins : "0" + mins;
						secs = dateValue.getSeconds() + "";
						secs = (secs.length > 1) ? secs : "0" + secs;
						response = yyyy + "-" + mm + "-" + dd + " " + hh + ":" + mins + ":" + secs;
						break;
					case "hh:MM:ss":
						hh = dateValue.getHours() + "";
						hh = (hh.length > 1) ? hh : "0" + hh;
						mins = dateValue.getMinutes() + "";
						mins = (mins.length > 1) ? mins : "0" + mins;
						secs = dateValue.getSeconds() + "";
						secs = (secs.length > 1) ? secs : "0" + secs;
						response = hh + ":" + mins + ":" + secs;
						break;
					case "dd/MM/yyyy hh:MM:ss":
						response = dd + "/" + mm + "/" + yyyy + " ";
						hh = dateValue.getHours() + "";
						hh = (hh.length > 1) ? hh : "0" + hh;
						mins = dateValue.getMinutes() + "";
						mins = (mins.length > 1) ? mins : "0" + mins;
						secs = dateValue.getSeconds() + "";
						secs = (secs.length > 1) ? secs : "0" + secs;
						response += hh + ":" + mins + ":" + secs;
						break;
					case "dd/MM/yyyy hh:MM:ss aa":
						response = mm + "/" + dd + "/" + yyyy + " ";
						hh = dateValue.getHours();
						var ampm = (hh >= 12) ? 'PM' : 'AM';
						hh = hh % 12;
						hh = (hh ? (hh < 10 ? "0" + hh : hh) : 12);
						// hh = (hh.length > 1) ? hh : "0" + hh;
						mins = dateValue.getMinutes() + "";
						mins = (mins.length > 1) ? mins : "0" + mins;
						secs = dateValue.getSeconds() + "";
						secs = (secs.length > 1) ? secs : "0" + secs;
						response += hh + ":" + mins + ":" + secs + " " + ampm;
						break;
					default:
						response = dateValue;
						break;
					}
				}
				return response;
			},
			/**
			 * Format PO Data
			 */

			dateFormatUTC: function (date) {
				if (date) {
					var dateSplit = date.substring(0, 19).split('T');
					var dateParts = dateSplit[0].split('-');
					var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
					return dateParts[2] + " " + month[dateParts[1] - 1] + ", " + dateParts[0] + " " + dateSplit[1];
				}
			},
			dateFormatUTCone: function (date) {
				if (date) {
					var dateSplit = date.substring(0, 19).split('T');
					var dateParts = dateSplit[0].split('-');
					var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
					return dateParts[2] + " " + month[dateParts[1] - 1] + ", " + dateParts[0];
				}
			},

			/**
			 * Format Addresses in an Attribute
			 */
			formatAddressAttributes: function (attr) {
				attr = (attr) ? attr : "";
				var formattedAttr, tempArray;
				while (attr.indexOf("|") > -1 || attr.indexOf("^") > -1) {
					tempArray = (attr.indexOf("^") > -1) ? attr.split("^") : attr.split("|");
					formattedAttr = "";
					jQuery.sap.each(tempArray, function (t) {
						formattedAttr += (tempArray[t] && tempArray[t].trim().length > 0) ? tempArray[t] + "\n" : "";
					});
					attr = formattedAttr;
				}
				return attr;
			},
			/**
			 * Format User Name
			 */
			formatterUserName: function (sDisplayName, sUniqueName) {
				return sDisplayName ? sDisplayName : sUniqueName;
			},
			/**
			 * Format Time Duration for Substitution Rules
			 */
			formatterTimeDuration: function (beginDate, endDate) {
				beginDate = (beginDate) ? new Date(beginDate) : "";
				endDate = (endDate) ? new Date(endDate) : "";

				if (!endDate) { //If End Date do not Exists
					return "";
				}

				var bInCurrentDateRange = !this._isFutureDate(beginDate);
				var iTotalDays = this._getActiveDays(bInCurrentDateRange, beginDate, endDate);
				var oResourceBundle = this.localizationBundle;
				if (bInCurrentDateRange) {
					if (iTotalDays == 1)
						iTotalDays = oResourceBundle.getText("substn.table.one_day_left");
					else if (iTotalDays > 1 && iTotalDays <= 60) {
						iTotalDays = oResourceBundle.getText("substn.table.days_left", iTotalDays);
					} else if (iTotalDays > 60 && iTotalDays < 3650) {
						iTotalDays = oResourceBundle.getText("substn.table.months_left", Math.floor(iTotalDays / 30));
					} else if (iTotalDays > 3650) {
						iTotalDays = oResourceBundle.getText("substn.table.forever_left");
					}

					return iTotalDays;

				} else {

					if (iTotalDays == 1)
						iTotalDays = oResourceBundle.getText("substn.table.starts_in_one_day");
					else if (iTotalDays > 1 && iTotalDays <= 60) {
						iTotalDays = oResourceBundle.getText("substn.table.starts_in_days", iTotalDays);
					} else if (iTotalDays > 60) {
						iTotalDays = oResourceBundle.getText("substn.table.starts_in_months", Math.floor(iTotalDays / 30));
					}
					return iTotalDays;
				}
			},

			// following function returns true if dateValue is in future else false
			_isFutureDate: function (dateValue) {
				if (dateValue) {
					if (this._getDiffWithCurrentTime(dateValue) > 0 && !this._isCurrentDate(
							dateValue)) {
						return true;
					}
				}
				return false;
			},
			// Compare two Date Values and return
			compareDates: function (date1, date2) {
				date1 = new Date(date1);
				date2 = new Date(date2);
				return (date1.getTime() === date2.getTime());
			},
			compareDatesNValidate: function (date1, date2) {
				date1 = new Date(date1);
				date2 = new Date(date2);
				var isValid = true;
				if (date1 && date2) {
					isValid = (date2.getTime() - date1.getTime() > 0) ? true : false;
				}
				return isValid;
			},
			getDaysDiff: function (date1, date2) {
				date1 = new Date(date1);
				date2 = new Date(date2);
				return Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));
			},
			getDurationInYearObject: function (startDate, endDate) {
				var durationList = [];
				var originalEndDate = new Date(endDate);
				var runningYear = startDate.getFullYear();
				var currentDate = new Date();
				var runningEndDate = new Date(currentDate.getFullYear(), 11, 31);
				var runningStartDate = new Date(startDate);
				while (runningYear <= originalEndDate.getFullYear()) {
					runningEndDate = (this.compareDatesNValidate(runningEndDate, originalEndDate)) ? new Date(runningYear, 11, 31) : originalEndDate;
					durationList.push({
						"durationYear": runningYear.toString(),
						"durationYearStartDate": this.formatDateAsString(runningStartDate, "dd/MM/yyyy"),
						"durationYearEndDate": this.formatDateAsString(runningEndDate, "dd/MM/yyyy"),
						"durationInDays": "40"
					});
					runningYear++;
					runningStartDate = new Date(runningYear, 0, 1);
					runningEndDate = new Date(runningYear, 11, 31);
				}
				return durationList;
			},
			// following function returns difference in milliseconds between dateValue and current date
			_getDiffWithCurrentTime: function (dateValue) {
				var today = new Date();
				var deadline = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate(), 24, 00, 00);
				var diff = deadline.getTime() - (today.getTime());
				return diff;
			},
			_isCurrentDate: function (dateValue) {
				if (dateValue) {
					var oCurrentDate = new Date();
					if ((oCurrentDate.getDate() == dateValue.getDate()) && (oCurrentDate.getMonth() == dateValue.getMonth()) && (oCurrentDate.getYear() ==
							dateValue.getYear())) {
						return true;
					}
				}
			},
			/* following function returns difference in days between the current date and end date if the rule is active.
			   else if the rule is in future, it returns the difference between the current date and start date */

			_getActiveDays: function (bInCurrentDateRange, startDate, endDate) {
				var timeDiff = this._getDiffWithCurrentTime(bInCurrentDateRange ? endDate : startDate) / (1000 * 60 *
					60 * 24);
				if (timeDiff > 1) {
					return Math.floor(timeDiff);
				} else if (timeDiff > 0) {
					return Math.ceil(timeDiff);
				}
			},
			/**
			 * Format Quarterly Display Range
			 */
			formatQuarterlyDisplay: function (billingDate) {
				billingDate = new Date(billingDate);
				var currentMonth = billingDate.getMonth();
				var calendarElement;
				var targetDate = new Date(billingDate.getFullYear() + 3, currentMonth, 1);
				var currentDate = billingDate;
				var dateRanges = [];
				var tempCnt = currentMonth;
				while (currentDate.getTime() < targetDate.getTime()) {
					calendarElement = {};
					calendarElement.startDate = new Date(billingDate.getFullYear(), tempCnt, 1);
					calendarElement.endDate = new Date(billingDate.getFullYear(), tempCnt + 1, 0);
					calendarElement.type = sap.ui.unified.CalendarDayType.Type03;
					tempCnt += 3;
					dateRanges.push(calendarElement);
					currentDate = calendarElement.endDate;
				}
				return dateRanges;
			},
			/**
			 * Get Monthly Cutoff Date
			 */
			getMonthlyCutoffDate: function (calendarElement, billingDate, selectedMonth, billingDays) {
				var selectedYear = billingDate.getFullYear();
				if (selectedMonth) {
					selectedYear += Math.trunc(selectedMonth / 12);
				}
				var tempCnt = (selectedMonth > 11) ? selectedMonth % 12 : selectedMonth;
				//Monthly Cutoff Date
				var cutOffDay = (billingDays instanceof Array && billingDays[tempCnt] && billingDays[tempCnt].day) ? Number(billingDays[tempCnt]
					.day) : "";
				if (cutOffDay) {
					var cutOffDate = new Date(selectedYear, tempCnt, cutOffDay);
					calendarElement.cutOffDate = this.formatDateAsString(cutOffDate, "yyyy-MM-dd");
				}
			},
			retrieveLowerItems: function (selectedKey, otherKey) {
				selectedKey = new Date(selectedKey);
				otherKey = new Date(otherKey);
				return selectedKey.getTime() >= otherKey.getTime();
			},
			/**
			 * Format Selected Range
			 */
			formatSelectedDates: function (startDate, endDate, dateRanges, isQuarterly) {
				startDate = (startDate) ? startDate : "";
				endDate = (endDate) ? endDate : "";

				var selectedElement, tempElement;
				var selectedDates = [];
				if (isQuarterly) { //Quarterly
					jQuery.sap.each(dateRanges, function (d) {
						tempElement = dateRanges[d];
						if (((startDate.getMonth() <= tempElement.startDate.getMonth()) && (startDate.getFullYear() === tempElement.startDate.getFullYear())) ||
							((tempElement.endDate.getMonth() >= endDate.getMonth()) && (tempElement.endDate.getFullYear() <= endDate.getFullYear()))) {
							selectedElement = {};
							selectedElement.selectedStartDate = tempElement.startDate;
							selectedElement.selectedEndDate = tempElement.endDate;
							selectedDates.push(selectedElement);
						}
					});
				} else { //Other Dates
					selectedElement = {};
					selectedElement.startDate = startDate;
					selectedElement.endDate = endDate;
					selectedDates.push(selectedElement);
				}
				return selectedDates;
			},

			parseObjectData: function (data) {
				if (data) {
					data = JSON.parse(JSON.stringify(data));
				}
				return data;
			},

			/**
			 * Check if Vendor@Gov site is entered
			 */
			checkIfVendorAtGov: function (siteAddress) {
				siteAddress = (siteAddress && siteAddress.trim()) ? siteAddress.trim().toUpperCase() : "";
				return (siteAddress.indexOf("@GOV") > -1);
			},
			removeLeadingZeroes: function (tempVal) {
				tempVal = (tempVal) ? tempVal + "" : "";
				tempVal = (tempVal) ? tempVal.replace(/^0+/, '') : tempVal;
				return tempVal;
			},
			convertToString: function (tempVal) {
				tempVal = (tempVal) ? (tempVal + "").trim() : "";
				return tempVal;
			},
			formatRequestAmount: function (val) {
				if (val && !isNaN(val)) {
					// val = Number(val);
					// val = val.toFixed(2);
					// val = (Math.floor(val * 100) / 100).toFixed(2);
					return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
				} else {
					return "";
				}
			},
			formatLabels: function (val) {
				if (val && val.indexOf(":") > -1) {
					val = val.split(":")[1];
					val = (val) ? val.trim() : "";
					// return noExtraFormatting ? val : val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
				}
				return val;
			},

			/**
			 * Compare and Check Between Billing Date and Cutoff Date
			 */
			splitDates: function (sDate, eDate, year) {
				var splitDates = {};
				// var currentDate = new Date();
				if (sDate.getFullYear() === year) {
					splitDates.startDate = sDate;
				}

				if (year > sDate.getFullYear()) {
					splitDates.startDate = new Date(year, 0, 1);
				}

				if (year < eDate.getFullYear()) {
					splitDates.endDate = new Date(year, 11, 31);
				}

				if (eDate.getFullYear() === year) {
					splitDates.endDate = eDate;
				}

				// splitDates.startDate = this.formatDateAsString(splitDates.startDate, "yyyy-MM-dd");
				// splitDates.endDate = this.formatDateAsString(splitDates.endDate, "yyyy-MM-dd");
				return splitDates;
			},

			convertDatesnew: function (date) {
				var dateObj = new Date(date);
				var options = {
					day: "numeric",
					month: "short",
					year: "numeric",
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
					hour12: false
				};
				var formattedDate = dateObj.toLocaleTimeString("en-US", options);
				return formattedDate;
			},

			mapCompanyNBankDetails: function (billReqData, data) {
				billReqData.companyDetails = {};
				billReqData.companyDetails.companyCode = (data.CompCode) ? data.CompCode : (data.CompanyCode) ? data.CompanyCode : billReqData.companyCode;
				billReqData.companyDetails.companyName = (data.CompanyBUName) ? data.CompanyBUName : data.CompanyName;
				billReqData.companyDetails.bankCurrency = (billReqData.currency) ? billReqData.currency : data.BankCurrency;
				billReqData.companyDetails.addressLine1 = (data.CompanyAddress) ? data.CompanyAddress : "";
				billReqData.companyDetails.addressLine2 = (data.CompanyAddress2) ? data.CompanyAddress2 : "";
				billReqData.companyDetails.telFaxNo = (data.CompanyTelFax) ? data.CompanyTelFax : "";
				billReqData.companyDetails.regNo = (data.CompanyRegistrationNo) ? data.CompanyRegistrationNo : "";
				billReqData.companyDetails.companyVAT = (data.CompanyVAT) ? data.CompanyVAT : "";
				billReqData.companyDetails.companyGST = (data.CompanyGST) ? data.CompanyGST : "";
				billReqData.companyDetails.payNow = (data.payNow) ? data.payNow : "";
				billReqData.companyDetails.gstVatRegNo = (data.CompanyVAT) ? data.CompanyVAT : "";
				billReqData.companyDetails.bankName = (data.BankName) ? this.formatLabels(data.BankName) : "";
				billReqData.companyDetails.beneficiaryName = (data.BankBeneficiaryName) ? this.formatLabels(data.BankBeneficiaryName) : "";
				billReqData.companyDetails.bankSwiftCode = (data.BankSwiftCode) ? this.formatLabels(data.BankSwiftCode) : "";
				billReqData.companyDetails.bankBranch = (data.BankBranchCode) ? this.formatLabels(data.BankBranchCode) : "";
				billReqData.companyDetails.bankCode = (data.BankBankCode) ? this.formatLabels(data.BankBankCode) : "";
				billReqData.companyDetails.bankAccNo = (data.BankAccountNo) ? this.formatLabels(data.BankAccountNo) : "";
				billReqData.companyDetails.bankAddressLine1 = (data.BankAddress1) ? data.BankAddress1 : "";
				billReqData.companyDetails.bankAddressLine2 = (data.BankAddress2) ? data.BankAddress2 : "";
			},
			mapCustomerAddress: function (address, isLookup) {
				var customerAddressList = [];
				var customerAddress = "";
				if (address) {
					var cnt = 0;
					delete(address.__metadata);
					jQuery.sap.each(address, function (aK, aV) {
						aV = (aV) ? aV.trim() : "";
						if (aV && aV.length > 0 && !(aV === "Company" || aV === "COMPANY") /*&& cnt > 0*/ ) {
							customerAddressList.push({
								"addressLineNo": cnt,
								"addressLineDesc": aV.toUpperCase()
							});
							customerAddress += aV + "\n";
						}
						cnt++;
					});
				}
				return (isLookup) ? customerAddress : customerAddressList;
			},
			/**
			 * Extract Synthesis Auth Data for Mass Upload Feature
			 */
			getSynthesisAuthData: function (authList, bundle) {
				var synthesisAuthData;
				jQuery.sap.each(authList, function (a, authElement) {
					if (!synthesisAuthData && authElement.companyCode === bundle.getText("BillingReq.Synthesis")) {
						synthesisAuthData = authElement;
					}
				});
				return synthesisAuthData;
			},
			paddingWithLeadingZeroes: function (num, size) {
				var s = num + "";
				while (s.length < size) s = "0" + s;
				return s;
			},
			/**
			 * Remove Special Characters from Amount
			 */
			removeSpecialCharsFromAmount: function (attr) {
				attr = (attr) ? attr : "";
				while (attr.indexOf(",") > -1) {
					attr = attr.replace(",", "");
				}
				return attr;
			},
			/**
			 * Formatter Method to fix the Decimal Places
			 */
			toFixed: function (num, fixed, isGstAmt) {
				fixed = fixed || 0;
				fixed = Math.pow(100, fixed);
				var value = Math.floor(num * fixed) / fixed;
				return isGstAmt ? (value + "") : (Number(value).toFixed(2));
			},

			decimalSeparator: function (value) {
				if (value && !isNaN(value)) {
					var number = parseFloat(value).toFixed(2);
					return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
					// value = parseFloat(value);
					// var number = Math.floor(value * 100) / 100;
					return number;
				} else {
					return 0.00;
				}
			},

			displayMonth: function (month, year) {
				var monthNames = [
					"Jan", "Feb", "Mar", "Apr",
					"May", "Jun", "Jul", "Aug",
					"Sep", "Oct", "Nov", "Dec"
				];
				var i = Number(month - 1);
				return monthNames[i] + ", " + year;
			},

			getItemsMessageElement: function (messageList, itemNo, messageElement) {
				for (var i = 0; i < messageList.length; i++) {
					if (messageList[i].title === ("Item #" + itemNo)) {
						messageElement.index = (i + 1);
						messageElement.counter = messageList[i].counter;
						messageElement.description = messageList[i].description;
						messageElement.type = messageList[i].type;
						messageElement.active = messageList[i].active;
						// messageElement = messageList[i];;
					}
				}
			},
			getLastDay: function (y, m) {
				return new Date(y, m + 1, 0).getDate();
			},
			computeAdminFee: function (amount, waiver, levyPercent, categ) {
				var amt = (amount) ? parseFloat(amount) : 0;
				// var levyPercent = levyPercent === undefined ? 10 : levyPercent;
				var calculatedValue = 0;
				if ((!waiver || waiver === "N") && levyPercent > 0) {
					var adminRatioValue = 10 - (Math.round(levyPercent / 10));
					var calculatedValue = amt / adminRatioValue;
					calculatedValue = calculatedValue ? calculatedValue.toFixed(2) : "";
				}
				return calculatedValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			},
			_amendHeaderToken: function (component, serviceToken) {
				var token = (serviceToken) ? serviceToken : component.AppModel.getProperty("/token");
				var oHeaders = {
					"Accept": "application/json",
					"Authorization": "Bearer" + " " + token,
					"AccessPoint": "A",
					"Content-Type": "application/json"
				};
				return oHeaders;
			},
			visibilityForClaimRequestType: function (userRole, massUploadRadioSelected, claimType) {
				var visibility = false;
				if (massUploadRadioSelected === true) {
					visibility = true;
				}
				return visibility;
			},

			decimalValue: function (oValue) {
				return parseFloat(oValue).toFixed(2);
			}

		};
	});