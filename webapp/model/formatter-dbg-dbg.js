sap.ui.define([], function (formatter) {
  "use strict";
  return {
    formatter: formatter,
    UserParamMap: {
      "VKO": "Sales Organisation",
      "USERBP": "User Business Partner",
      "DP_KUNNR": "Dealer Portal Current customer"
    },
    _statusStateMap: { 
      "Open": "Warning",
      "Submitted": "Success",
      "INP": "Error",
      "SUB": "Success"
    },
    _wtyStatusStateMap: {
      "INP": "Error",
      "SUB": "Success",
      "ZRTN": "Error",
      "B006": "Success",
      "B005": "Warning"
    },
    statusText: function (sStatus) {
      var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
      switch (sStatus) {
        case "A":
          return resourceBundle.getText("invoiceStatusA");
        case "B":
          return resourceBundle.getText("invoiceStatusB");
        case "C":
          return resourceBundle.getText("invoiceStatusC");
        default:
          return sStatus;
      }
    },
    removeLeadingZeroes: function (value) {
      return (typeof value === 'string') ? value.replace(/^0+/, '') : value;
    },
    Date: function (value) {
      if (value) {
        var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
          pattern: "E dd MMMM yyyy" //"dd-MM-yyyy"
        });
        return oDateFormat.format(new Date(value));
      } else {
        return value;
      }
    },
    ShortDate: function (value) {
      if (value) {
        var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
          pattern: "dd MMM yyyy"
        });
        return oDateFormat.format(new Date(value));
      } else {
        return value;
      }
    },
    ReversedDate: function (value) {
      if (value) {
        var year = value.substring(0,4),
        month = value.substring(4,6),
        day = value.substring(6,8),

        validDate = day + "." + month + "." + year;

        if (validDate === "00.00.0000") return "";
        else return validDate;
        
      } else {
        return value;
      }
    },
    Time: function (value) {
      if (value) {
        return sap.ui.core.format.DateFormat.getTimeInstance({
          pattern: "kk:mm:ss"
        }).format(new Date(new Date('2017', '01', '01', '0', '0', '0', '0').getTime() + value.ms));
      } else {
        return value;
      }
    },
    DateTime: function (value) {
      try {
        var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
          pattern: "dd/MM/yyyy HH:mm"
        });
        var dateTimeString = oDateFormat.format(new Date(value));
        return dateTimeString;
      } catch (err) {
        return value;
      }
    },
    TZOffsetDate: function (utcDate) {
      //// timezoneOffset is in hours convert to milliseconds
      //var TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;
      //return new Date(utcDate.getTime() - TZOffsetMs);
      return utcDate;
    },
    Number: function (value) {
      return isNaN(value) ? value : this.formatter.Quantity(value);
    },
    HoursNew: function (value) {
      return isNaN(value) ? parseFloat(value).toFixed(2) : value;
    },
    MaxTwoDecimals: function (value) {
      try {
        return (value) ? Number(parseFloat(value).toFixed(2)).toString() : value;
      } catch (err) {
        return "Not-A-Number";
      }
    },
    GreaterThan: function (a, b) {
      return isNaN(a) || isNaN(b) ? false : Number(a) > Number(b);
    },
    Value: function (value) {
      try {
        return (value) ? '$' + parseFloat(value).toFixed(2) : value;
      } catch (err) {
        return "Not-A-Number";
      }
    },
    parseFloat: function (value) {
      return parseFloat(value);
    },
    exists: function (object) {
      return object ? true : false;
      //        return (object && object.length > 0);
    },
    arrayCount: function (oArray) {
      return jQuery.isArray(oArray) ? oArray.length === 0 ? null : oArray.length : 0;
    },
    arrayCountVisible: function (oArray) {
      if (!oArray) return;
      if (jQuery.isArray(oArray)) {
        return oArray.length === 0 ? false : true;
      } else {
        return false;
      }
    },
    Quantity: function (value) {
      try {
        return (value) ? parseFloat(value).toFixed(0) : value;
      } catch (err) {
        return "Not-A-Number";
      }
    },
    currencyValue: function (value) {
      return isNaN(value) ? parseFloat(value).toFixed(2) : value;
    },
    isInteger: function (value) {
      return !(isNaN(value) || value !== parseFloat(value).toFixed(0));
    },
    quantityValue: function (value) {
      if (!value) return;
      return isNaN(value) ? 0 : parseFloat(value).toFixed(0);
    },
    quantityState: function (value) {
      if (value === 0) {
        return sap.ui.core.ValueState.Error;
      }
      if (value < 5) {
        return sap.ui.core.ValueState.Warning;
      }
      return sap.ui.core.ValueState.Success;
    },
    isAustralia: function (value) {
      return this.myComponent.getMySetting('DP_COUNTRY').Value === 'AU';
    },
    isNZ: function (value) {
      return this.myComponent.getMySetting('DP_COUNTRY').Value === 'NZ';
    },
    setProperCountry: function (value) {
      if (value === '') {
        return 'ALL';
      }
      return value;
    },
    quantityStateSOH: function (value) {
      if (value == 0 || value === null) {
        return sap.ui.core.ValueState.Error;
      }
      if (value > 0) {
        return sap.ui.core.ValueState.Success;
      }
    },

    SOStatusState: function (value) {
      return (value && this.formatter._statusStateMap[value]) ? this.formatter._statusStateMap[value] : "None";
    },

    wtyStatusState: function (value) {
      return (value && this.formatter._wtyStatusStateMap[value]) ? this.formatter._wtyStatusStateMap[value] : "None";
    },

    wtyICOCValue: function (ICval, OCval, OCVersionGUID) {
      return !OCVersionGUID || ( OCVersionGUID === null || OCVersionGUID === "00000000-0000-0000-0000-000000000000" ) ? ICval : OCval;
    },
    wtyICOCState: function (ICval, OCval) {
      return 'Success';
      //        return ICval === OCval ? 'Success' : 'Warning';
    },

    wtyVersionTextMap: {
      "IC": "Incoming Customer",
      "OV": "Outgoing Vendor",
      "IV": "Incoming Vendor",
      "OC": "Outgoing Customer"
    },

    wtyVersionText: function (value) {
      var map = dp.util.Formatter.wtyVersionTextMap; // eslint-disable-line
      return (value && map[value]) ? map[value] : value;
    },

    sizeFormatter: function (size) {
      var i = Math.floor(Math.log(size) / Math.log(1024));
      return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
    },
    iconFormatter: function (fileType) {
      fileType = (fileType) ? fileType.toLowerCase() : '';

      var icon = 'sap-icon://attachment';
      switch (fileType) {
        case 'doc':
        case 'excel':
        case 'pdf':
        case 'ppt':
          icon = 'sap-icon://' + fileType + '-attachment';
          break;
        case 'docx':
          icon = 'sap-icon://doc-attachment';
          break;
        case 'xlsx':
        case 'xlr':
        case 'csv':
          icon = 'sap-icon://excel-attachment';
          break;
        case 'pptx':
        case 'pps':
          icon = 'sap-icon://ppt-attachment';
          break;
        case 'txt':
          icon = 'sap-icon://attachment-text-file';
          break;
        case 'zip':
          icon = 'sap-icon://attachment-zip-file';
          break;
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'tif':
        case 'bmp':
          icon = 'sap-icon://attachment-photo';
          break;
        case 'mp3':
        case 'aiff':
        case 'aif':
        case 'au':
        case 'mid':
        case 'midi':
        case 'wav':
        case 'ra':
        case 'wma':
        case 'mpa':
        case 'm4a':
        case 'm3u':
        case 'iff':
          icon = 'sap-icon://attachment-audio';
          break;
        case 'mp4':
        case 'mpeg':
        case 'mov':
        case 'qt':
        case 'avi':
        case 'flv':
        case 'm4v':
        case 'mpg':
        case 'wmv':
          icon = 'sap-icon://attachment-video';
          break;
        case 'html':
        case 'htm':
        case 'xml':
          icon = 'sap-icon://attachment-html';
          break;
        case 'ssm':
        case 'sepf':
          icon = 'sap-icon://car-rental';
        default:
      }
      return icon;
    },
    numberOfLines: function (inText) {
      return inText ? inText.split('\n').length : 1;
    },
    lessThan10: function (value) {
      return value < 10;
    },
    hasMoreThanOneSchedule: function (aScheduleLine) {
      if (aScheduleLine.length > 1)
        return true;
      return false;
    },
    setClassTBC: function (value) {
      if (value) {
        return "";
      } else {
        return "iTtalicFont";
      }
    },
    setProperClass: function (aScheduleLine, sValue) {
      if (this.formatter.hasMoreThanOneSchedule(aScheduleLine)) {
        return "etaColor";
      } else {
        return this.formatter.setClassTBC(sValue);
      }
    },
    tbcShortDate: function (value) {
      if (value) {
        var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
          pattern: "dd MMM yyyy"
        });
        return oDateFormat.format(new Date(value));
      } else {
        return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("ToBeConfirmed");
      }
    },
    toInteger: function (sValue) {
      return parseInt(sValue);
    },
    wtyDisplayHours: function (value, uom) {

      // if (uom ==="H"){
      //   var aHours = value.split('.');
      //   if (aHours.length >1) var rValue = parseInt(aHours[0], 10) +"h " + (parseInt(aHours[1], 10) * 60).toString().substring(0,2) + "min";
      //   else var rValue = parseInt(aHours[0], 10) +"h 00min";
      //   return rValue;
      // }else{
      try {
        return (value) ? Number(parseFloat(value).toFixed(2)).toString() + " " + uom : value;
      } catch (err) {
        return "Not-A-Number";
      }
      // }
    },
    StatusState: function (value) {
      return (value && this.formatter._statusStateMap[value]) ? this.formatter._statusStateMap[value] : "None";
    },
    BBstatus: function (sValue) {
      if (sValue === "Submitted") return "Success";
      else if (sValue === "Open") return "Warning";
      else return "None";
    },
    fprsState: function(sValue){
      if (sValue === "F3") return "Success";
      else return "Error";
    },
    fprsDealerNamePresent: function(sDName,sDNumber)
    {
      if (sDName === "") return sDNumber;
      else return sDName;
    },
    formatKMS: function(value){
      return (value) ? Number.parseFloat(value.toString()) : value;
    }
  };
});