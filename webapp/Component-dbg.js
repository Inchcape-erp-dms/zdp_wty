if (window.location.hostname.indexOf('webidetesting') !== -1) {
	jQuery.sap.registerModulePath("encollab.dp", "./dpapp");
} else {
	jQuery.sap.registerModulePath("encollab.dp", "../../../../sap/zlib/dp");
}sap.ui.define([
  "encollab/dp/Component",
  "sap/ui/model/json/JSONModel",
  "encollab/dp/info/InfoDialog",
  "encollab/dp/notification/NotificationDialog",
  'sap/m/MessagePopover',
  'sap/m/MessagePopoverItem',
  'sap/m/MessageToast',
  'sap/ui/core/MessageType',
  "sap/ui/Device",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/ws/SapPcpWebSocket"
], function(UIComponent, JSONModel, InfoDialog, NotificationDialog, MessagePopover, MessagePopoverItem, MessageToast, MessageType, Device, Filter, FilterOperator, SapPcpWebSocket) {
	"use strict";

	return UIComponent.extend("hicron.dp.wty.Component", {
		init: function () {
			UIComponent.prototype.init.apply(this, arguments);
		}
  });
});