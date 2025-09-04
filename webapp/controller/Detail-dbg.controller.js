sap.ui.define([
	//"encollab/dp/BaseController",
	"hicron/dp/wty/controller/BaseController",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/unified/FileUploaderParameter",
	"sap/ui/core/Item",
	"sap/ui/model/json/JSONModel",
	"sap/m/UploadCollectionParameter",
	"hicron/dp/wty/model/formatter",
	"encollab/dp/controls/PartObjectNumber"
], function (Controller, MessageBox, MessageToast, Filter, FilterOperator, FileUploaderParameter, Item, JSONModel,
	UploadCollectionParameter, formatter, PartObjectNumber) {
	"use strict";
	return Controller.extend("hicron.dp.wty.controller.Detail", {
		formatter: formatter,
		_userAuthorisations: ['WarrantyClaims'],
		_userParameters: ['VKO'],
		_causalPart: null,
		_textMap: [
			'customerComplaint',
			'cause',
			'correction',
			'generalText'
		],
		onInit: function () {
			Controller.prototype.onInit.apply(this, arguments);

			this.setModel(new JSONModel({
				maxDate: new Date()
			}), "viewModel");

			this.myRouter.getRoute("wtydetail").attachPatternMatched(this._onObjectMatched, this);
		},
		onAfterViewRendered: function (oEvent) {
			Controller.prototype.onAfterViewRendered.apply(this, arguments);
			window.document.title = 'Claim Enquiry';
		},
		_onObjectMatched: function (oEvent) {
			this.myView.setBusy(true);
			var sWtyPath = "/" + oEvent.getParameter("arguments").wtyPath;
			try {
				this._causalPart = oEvent.getParameter('arguments')['?params'].causalPart;
			} catch (err) { }

			var oView = this.myView;
			//this.mainModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
			//this.myView.setModel(this.mainModel);
			this.myView.bindElement({
				path: sWtyPath,
				parameters: {
					expand: 'WtyItems,WtyHeaderAttachments,Forms,Contribution'
				},
				events: {
					dataRequested: function () {
						oView.setBusy(true);
					},
					dataReceived: this._onDataReceived.bind(this),
					change: this._onBindingChange.bind(this)
				}
			});

			//Check if the data is already on the client
			if (!this.mainModel.getData(sWtyPath + '/WtyItems')) {
				// Check that the part specified actually was found.
				this.myView.getElementBinding().attachEventOnce("dataReceived", jQuery.proxy(function () {
					var oData = this.mainModel.getData(sWtyPath);
					if (!oData) {
						this.fireDetailNotFound();
					} else {
						this.fireDetailChanged(sWtyPath);
					}
				}, this));

			} else {
				this.fireDetailChanged(sWtyPath);
			}

			var oCont = this;
			this.getView().getModel().read('/WtySymptomCategorySet', {
				success: function (oData) {
					//console.log(oData);
					oCont.getView().setModel(new JSONModel(oData), "WtySymptomCateg");
					oCont.getView().getModel().read('/WtySymptomCodes', {
						success: function (oData) {
							//   console.log(oData);
							oCont.getView().setModel(new JSONModel(oData), "WtySymptomCodes");
						}
					});
				}
			});

			this.getView().getModel().read('/WtyTroubleCategorySet', {
				success: function (oData) {
					//console.log(oData);
					oCont.getView().setModel(new JSONModel(oData), "WtyTroubleCategory");
					oCont.getView().getModel().read('/WtyTroubleCodes', {
						success: function (oData) {
							//  console.log(oData); 
							oCont.getView().setModel(new JSONModel(oData), "WtyTroubleCodes");
						}
					});
				}
			});
		},
		_onDataReceived: function (oEvent) {
			this.getView().setBusy(false);

			// Authorisation check
			if (!this.isUserAuthorised('WarrantyCreate')) return;

			var viewModel = this.getModel('viewModel');
			var oWtyHeader = this.getView().getBindingContext().getObject();
			var oModel = this.getView().getBindingContext().getModel();
			var oWtyItems = this.getView().getBindingContext().getObject().WtyItems.__list;
			var oItem = {};
			viewModel.setProperty('/SerialColumnVis', false);
			viewModel.setProperty('/AttachmentNeeded', false);
			//Check if Serial numbers are required
			for (var i = 0; i < oWtyItems.length; i++) {
				oItem = oModel.oData[oWtyItems[i]];
				if (oItem.SerNumberReq === "X") {
					viewModel.setProperty('/SerialColumnVis', true);
				}
				if (oItem.AttachReq === "X") {
					viewModel.setProperty('/AttachmentNeeded', true);
				}
			}
			var Dealer = this.getOwnerComponent().getMyDealers().filter(
				function (a) {
					return a.Id === oWtyHeader.PartnerNr;
				});
			// Can't do anything unless for my dealer
			if (Dealer.length === 0) return;

			//SetFieldsEditable
			viewModel.setProperty('/isKmsAndDealerChangable', this._setFieldsChangable(oWtyHeader));
			viewModel.setProperty('/refDateIsValid', true);
			// Check status
			if (oWtyHeader.ProcessingStatus === "" || oWtyHeader.ProcessingStatus === "B001" || oWtyHeader.ProcessingStatus === "ZRTN" || oWtyHeader.ProcessingStatus === "ZRTR") {
				viewModel.setProperty('/isSubmitable', true);
				viewModel.setProperty('/isReadyToSubmit', this._checkIsReadyToSubmit());
				viewModel.setProperty('/isDeleteable', true);
				// viewModel.setProperty('/isKmsAndDealerChangable', true);
				if (this._wtyClaimsLockedMap[oWtyHeader.ClaimType]) {
					viewModel.setProperty('/isChangeable', !oWtyHeader.IsRecallBased);
					viewModel.setProperty('/isTextsChangeable', !oWtyHeader.IsRecallBased);
					viewModel.setProperty('/isGeneralTextChangeable', !oWtyHeader.IsRecallBased);
					viewModel.setProperty('/isPWAAllowed', !oWtyHeader.IsRecallBased && oWtyHeader.ClaimType !== 'ZAUT' && oWtyHeader.AuthorisationNr ===
						'');
				}
			}
			// if (oWtyHeader.ProcessingStatus === "B006" ||
				if (oWtyHeader.ProcessingStatus === "ZRTR") {
				viewModel.setProperty('/isAmendable', true);
			}
			if (oWtyHeader.ProcessingStatus === "ZCN1") {
				viewModel.setProperty('/isZCN1', true);
			}
			if (oWtyHeader.ClaimType === "ZZSP") {
				if (oWtyHeader.ProcessingStatus === "B001") {
					viewModel.setProperty('/isTextsChangeable', true);
					viewModel.setProperty('/isGeneralTextChangeable', true);
				}
			}
			if (oWtyHeader.IsRecallBased === true) {
				viewModel.setProperty('/isGeneralTextChangeable', true);
			}
			if (oWtyHeader.ClaimType === "ZAUT") {
				viewModel.setProperty('/showContributionTab', true);
				if (oWtyHeader.ProcessingStatus === "B006") {
					viewModel.setProperty('/isPWACreateable', true);
				}
			} else {
				if (viewModel.getProperty('/isSubmitable') && oWtyHeader.ReferenceNr === '') {
					MessageToast.show('Please enter Dealer RO');
				}
			}
			viewModel.setProperty('/saveButtonTexts',
				viewModel.getProperty('/isGeneralTextChangeable') || viewModel.getProperty('/isTextsChangeable'));

			this.getView().byId('saveTextsButton').setEnabled(false).setType('Transparent');

			// this.getView().byId('WtyItems').bindItems({
			//   path:"/WtyItems"
			// }
			// );

		},
		_setFieldsChangable: function (oWtyHeader) {
			if (oWtyHeader.ProcessingStatus === "" || oWtyHeader.ProcessingStatus === "B001" || oWtyHeader.ProcessingStatus === "ZRTN") {
				return true;
			} else return false;
		},
		_onBindingChange: function (oEvent) {
			// Set all flags to false
			var viewModel = this.getModel('viewModel');
			viewModel.setProperty('/isAmendable', false);
			viewModel.setProperty('/isChangeable', false);
			viewModel.setProperty('/isTextsChangeable', false);
			viewModel.setProperty('/isPWAAllowed', false);
			viewModel.setProperty('/isPWACreateable', false);
			viewModel.setProperty('/isSubmitable', false);
			viewModel.setProperty('/isReadyToSubmit', false);
			viewModel.setProperty('/isDeleteable', false);
			viewModel.setProperty('/showContributionTab', false);
			viewModel.setProperty('/showContributionError', false);
			viewModel.setProperty('/isZCN1', false);
			viewModel.setProperty('/isGeneralTextChangeable', false);
			viewModel.setProperty('/saveButtonTexts', false);
			viewModel.setProperty('/isKmsAndDealerChangable', false);

			//redo the access checks
			this._onDataReceived();
		},
		_wtyClaimsLockedMap: {
			"ZAUT": true, // Authorization claims PWA
			"ZZCA": false, // Service Campaign Claim type
			"ZZCC": true, // Compound Claim type
			"ZZCF": false, // Factory Recall claim type
			"ZZEC": true, // End Customer Claim type
			"ZZEX": true, // Exchange Program claims
			"ZZFS": false, // Free Servicing Claim type
			"ZZGW": true, // Goodwill Claim type
			"ZZIC": true, // Internal Claim type
			"ZZNV": true, // New Car warranty Claim type
			"ZZPC": true, // Parts Counter Claim type
			"ZZPD": true, // PDI Claim type
			"ZZPW": true, // Parts Warranty Claim type
			"ZZSP": false, // Paid Service Plan claim type
			"ZZWT": true, // Wear and Tear Claim type
			"ZZEW": true,
			"ZZBW": true, // Warranty type for solterra batery
			"ZZUW": true,
		},

		isChangeable: function (obj) {
			return this.getModel('viewModel').getProperty('/isChangeable');
		},
		onIconTabBarSelect: function (oEvent) {
			var oTabItem = oEvent.getParameter('item');
			if (oTabItem.getId().indexOf('iconTabTexts') != -1) {
				this._checkInchcapeTexts();
			}
		},
		attachmentsVisible: function (obj) {
			return true; // This change requested 9/12/2016
			//return this.isChangeable(obj) || this.formatter.arrayCountVisible(obj);
		},
		_checkIsReadyToSubmit: function (evt) {
			try {
				var oWtyHeader = this.getView().getBindingContext().getObject();
				if (oWtyHeader) {
					if (oWtyHeader.ProcessingStatus === "" ||
						oWtyHeader.ProcessingStatus === "B001" ||
						oWtyHeader.ProcessingStatus === "ZRTN") {
						if (this.myView.getBindingContext()) {
							return this._checkDataComplete(evt);
						}
					}
				}
			} catch (err) {
				return false;
			}
		},

		_checkLiveChangeSerial: function (evt) {
			this.myView.getModel("viewModel").setProperty('/isReadyToSubmit', this._checkIsReadyToSubmit(evt));
		},

		fittedRRPFormatter: function (FittedRRP, RRP) {
			if (this.formatter.GreaterThan(FittedRRP, RRP)) {
				return '$' + this.formatter.currencyValue(FittedRRP);
			} else {
				return 'N/A';
			}
		},

		isReadyToCreate: function (obj) {
			if (!obj) return false;

			if (this.myView.getBindingContext()) {
				var oWtyHeader = this.myView.getBindingContext().getObject();
				return oWtyHeader ? (oWtyHeader.ClaimType === "ZAUT" && oWtyHeader.ProcessingStatus === "B006") : false;
			}
		},
		_checkDataComplete: function (evt) {
			return this._checkHeader() && this._checkItems() && this._checkInchcapeTexts() && this._checkContributions() && this._checkAttachments() &&
				this._checkSerialFullfilled(evt);
		},

		clearSerialNoPopup: function () {
			this._infoSerial = false;
			this.getModel("viewModel").setProperty("/serConfEnabl", false);
			this.getModel("viewModel").setProperty("/serialValueState", sap.ui.core.ValueState.None);
			this.getModel("viewModel").setProperty("/serialValueStateText", "");
		},

		checkSerialNumber: function (sSerialNumber, sPartNumber, sCausalPart, itemGUID, scanned) {
			var oData = this.myView.getBindingContext().getObject();
			this._infoSerial = false;
			this.getModel("viewModel").setProperty("/serConfEnabl", false);
			this.getModel('recall').callFunction('/SerialNumberValidation', {
				method: 'GET',
				urlParameters: {
					recallNumber: "",
					claimGUID: oData.GUID,
					vehicleVIN: oData.VIN,
					serialNumber: sSerialNumber,
					partNumber: sPartNumber,
					causalPart: sCausalPart,
					itemGUID: itemGUID
				},
				success: function (data) {

					switch (data.Status) {
						case 'E':
							this._infoSerial = false;
							this._serialValidation = true;
							this.getModel("viewModel").setProperty("/serConfEnabl", false);
							this.getModel("viewModel").setProperty("/serialValueState", sap.ui.core.ValueState.Error);
							this.getModel("viewModel").setProperty("/serialValueStateText", "Serial No. is not valid for a given part");
							break;
						case 'I':
							this._infoSerial = true;
							this._serialValidation = true;
							this.getModel("viewModel").setProperty("/serConfEnabl", true);
							this.getModel("viewModel").setProperty("/serialValueState", sap.ui.core.ValueState.Warning);
							this.getModel("viewModel").setProperty("/serialValueStateText", "Serial No. is related with different VIN");
							break;
						case 'S':
							this._infoSerial = false;
							this._serialValidation = true;
							this.getModel("viewModel").setProperty("/serConfEnabl", true);
							this.getModel("viewModel").setProperty("/serialValueState", sap.ui.core.ValueState.Success);
							this.getModel("viewModel").setProperty("/serialValueStateText", "");
							break;
						case 'N':
							this._infoSerial = false;
							this._serialValidation = false;
							this.getModel("viewModel").setProperty("/serConfEnabl", true);
							this.getModel("viewModel").setProperty("/serialValueState", sap.ui.core.ValueState.None);
							this.getModel("viewModel").setProperty("/serialValueStateText", "");
							break;
						default:
							this._infoSerial = false;
							this._serialValidation = false;
							this.getModel("viewModel").setProperty("/serConfEnabl", true);
							this.getModel("viewModel").setProperty("/serialValueState", sap.ui.core.ValueState.None);
							this.getModel("viewModel").setProperty("/serialValueStateText", "");
							break;
					}
					if (scanned && this.getModel("viewModel").getProperty("/serConfEnabl")) {
						this._findElementIn('serialConfirmButtonId', this._oDialog.findElements(true)).firePress();
					}
				}.bind(this),
				error: function (oError) {
					this._serialValidation = false;
					this.getModel("viewModel").setProperty("/serConfEnabl", true);
					MessageBox.alert(this.gatewayError(oError), {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "Error"
					});
				}.bind(this)
			});
		},

		liveCheckSerialNumber: function (oEvent) {
			if (this._serialValidation) {
				var serialNo = oEvent.getSource().getValue();
				var materialNo = oEvent.getSource().getBindingContext().getObject().Material;
				var causalPart = oEvent.getSource().getBindingContext().getObject().CausalPart;
				var itemGUID = oEvent.getSource().getBindingContext().getObject().ItemGUID;
				this.checkSerialNumber(serialNo, materialNo, causalPart, itemGUID);
			}
		},

		onEditSerial: function (evt) {
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.addSerialNumberDialog", this);
			this.myView.addDependent(this._oDialog);
			this._oDialog.bindElement({
				path: evt.getSource().getBindingContext().getPath()
			});
			this.clearSerialNoPopup();
			var oObject = evt.getSource().getBindingContext().getObject();
			this.checkSerialNumber(oObject.SerNumber,
				oObject.Material,
				oObject.CausalPart,
				oObject.ItemGUID);
			this.getModel("viewModel").setProperty("/serConfEnabl", false);
			this._oDialog.open();
		},

		onSerialConfirm: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext().getPath();
			if (this._infoSerial) {
				this.dialogWarningPopup(sPath);
			} else {
				this.serialConfirm(sPath);
			}
		},
		serialConfirm: function (sPath) {
			var oInput = this._findElementIn('idSerialNumber', this._oDialog.findElements(true));
			// var sPath = oEvent.getSource().getBindingContext().getPath();

			this.onDialogCancel();
			this.busyDialog.open();

			this._performUpdate(sPath, {
				'SerNumber': oInput.getValue()
			});
		},

		dialogWarningPopup: function (sPath) {
			this._dialogWarning = sap.ui.xmlfragment("hicron.dp.wty.view.confirmWarningSerialDialog", this);
			this.myView.addDependent(this._dialogWarning);
			this._dialogWarning.bindElement({
				path: sPath
			});
			this._dialogWarning.open();
		},

		onWarningConfirm: function (oEvent) {
			this._warningConfirmed = true;
			this.onWarningCancel();
			this.serialConfirm(oEvent.getSource().getBindingContext().getPath());
		},

		onWarningCancel: function (oEvent) {
			try {
				this._dialogWarning.close().destroy();
			} catch (err) { }
		},

		_checkSerialFullfilled: function (evt) {
			var bNotAllFilled = false;
			var aWtyItems = this.myView.getBindingContext().getObject().WtyItems.__list;
			var sSerNumber = "";
			var bReq = "";

			for (var i = 0; i < this.myView.byId("wtyItems").getItems().length; i++) {

				bReq = this.mainModel.getProperty("/" + aWtyItems[i]).SerNumberReq;

				sSerNumber = this.mainModel.getProperty("/" + aWtyItems[i]).SerNumber;

				if (bReq === 'X' && sSerNumber === "") {
					bNotAllFilled = true;
				}
			}

			if (bNotAllFilled) {
				return false;
			}
			return true;
		},

		_checkHeader: function () {
			var oWtyHeader = this.myView.getBindingContext().getObject();
			return oWtyHeader.ClaimType === 'ZAUT' || oWtyHeader.ReferenceNr.length > 0;
		},
		_checkItems: function () {
			var oWtyHeader = this.myView.getBindingContext().getObject();
			if (["ZZSP", "ZZ1S"].indexOf(oWtyHeader.ClaimType) >= 0) return true; //Paid Service Plan

			var causalPart = false;
			var causalLabor = false;
			for (var i = 0, oWtyItem, aItems = this.myView.byId('wtyItems').getItems(); i < aItems.length; i++) {
				oWtyItem = aItems[i].getBindingContext().getObject();
				if (oWtyItem.CausalPart === 'X') {
					causalPart = true;
				}
				if (oWtyItem.CausalLabor === 'X') {
					causalLabor = true;
				}
			}
			if (oWtyHeader.ClaimType === 'ZZPC') {
				causalLabor = true;
			}
			return causalPart && causalLabor;
		},
		_checkInchcapeTexts: function () {
			var allOk = true;
			// get texts
			var errorStateMsg = this.getText("wtyTextErrorStateMessage");
			// Check Inchcape-specific required text fields.
			var oIconTabTexts = this.myView.byId('iconTabTexts');
			if (this.isCustomerInchcape()) {
				var oComplaint = this.myView.byId('customerComplaint');
				if (oComplaint.getValue() === "") {
					allOk = false;
					oComplaint.setValueState('Error').setValueStateText(errorStateMsg);
				} else {
					oComplaint.setValueState('None').setValueStateText('');
				}
				var oCause = this.myView.byId('cause');
				if (oCause.getValue() === "") {
					allOk = false;
					oCause.setValueState('Error').setValueStateText(errorStateMsg);
				} else {
					oCause.setValueState('None').setValueStateText('');
				}
				var oCorrection = this.myView.byId('correction');
				if (oCorrection.getValue() === "") {
					allOk = false;
					oCorrection.setValueState('Error').setValueStateText(errorStateMsg);
				} else {
					oCorrection.setValueState('None').setValueStateText('');
				}
				if (this.myComponent.getMySetting('DP_COUNTRY').Value === 'NZ') {
					if (this.getView().byId('idWtyAttachments').getItems().length > 0) {
						var oGeneral = this.myView.byId('generalText');
						if (oGeneral.getValue() === "") {
							allOk = false;
							oGeneral.setValueState('Error').setValueStateText(errorStateMsg);
						} else {
							oGeneral.setValueState('None').setValueStateText('');
						}
					}
				}
			}
			if (allOk) {
				oIconTabTexts.setIconColor("Default");
			} else {
				oIconTabTexts.setIconColor("Negative");
			}
			return allOk;
		},
		_checkAttachments: function () {
			var oWtyHeader = this.getView().getBindingContext().getObject();
			var oViewModel = this.getModel('viewModel');
			if (((oWtyHeader.ClaimType === 'ZZPC' && //Parts Counter Claim
				this.myComponent.getMySetting('DP_COUNTRY').Value === 'NZ') ||
				oViewModel.getProperty("/AttachmentNeeded") === true) &&
				this.getView().byId('idWtyAttachments').getItems().length === 0) {
				this.getView().byId('attachTab').setIconColor("Negative");
				return false;
			} else {
				if (oViewModel.getProperty("/AttachmentNeeded") === true && this.getView().byId('idWtyAttachments').getItems().length === 0) {
					return false;
				} else {
					this.getView().byId('attachTab').setIconColor("Default");
					return true;
				}
			}
		},
		itemTypeFormatter: function (defaultLabel, causalPart, causalLabor) {
			if (causalPart === 'X') {
				return this.getText('wtyDetailCausalPart');
			} else {
				if (causalLabor === 'X') {
					return this.getText('wtyDetailCausalLabour');
				} else {
					return defaultLabel;
				}
			}
		},
		fireDetailChanged: function (sWtyPath) {
			this.myView.setBusy(false);
		},
		fireDetailNotFound: function () {
			//console.warn('fireDetailNotFound');
		},
		onUpdateFinished: function (oEvent) {
			this.myView.setBusy(false);

			if (this.isChangeable('dummy')) {
				var causalPart = false;
				var causalLabor = false;

				for (var i = 0, oWtyItem, aItems = oEvent.getSource().getItems(); i < aItems.length; i++) {
					oWtyItem = aItems[i].getBindingContext().getObject();
					if (oWtyItem.CausalPart === 'X') {
						causalPart = true;
					}
					if (oWtyItem.CausalLabor === 'X') {
						causalLabor = true;
					}
				}
				// No Causal Part Found
				if (!causalPart) {
					if (this._causalPart) {
						this._AddCausal(this._causalPart, '1');
					} else {
						this.addCausalPart(oEvent);
					}
				} else {
					var oData = this.myView.getBindingContext().getObject();
					if (oData.ClaimType !== 'ZZPC' && !causalLabor) {
						this.addCausalLabor(oEvent);
						//this.onItemAddFlatRate(oEvent);
					} else {
						this._onDataReceived();
					}
				}
			}
			this._setupContribModel();
		},
		_setupContribModel: function () {
			var oData = this.myView.getBindingContext().getObject();
			if (oData.ClaimType === 'ZAUT') {

				// This sets up model for contributions
				var oModel = this.myView.getModel('contribModel');
				if (!oModel) {
					oModel = new JSONModel();
					this.myView.setModel(oModel, "contribModel");
				}

				var oContributions = this.getModel().getProperty(this.getView().getBindingContext().getPath() + '/Contribution');
				var contribs = {
					"Items": {
						"Part": {
							"id": 'Part',
							"label": 'Parts',
							"Distributor": Number(oContributions.PartSubaruCont),
							"Dealer": Number(oContributions.PartDealerCont),
							"Customer": Number(oContributions.PartOwnerCont)
						},
						"Labor": {
							"id": 'Labor',
							"label": 'Labour',
							"Distributor": Number(oContributions.LaborSubaruCont),
							"Dealer": Number(oContributions.LaborDealerCont),
							"Customer": Number(oContributions.LaborOwnerCont)
						},
						"Sublet": {
							"id": 'Sublet',
							"label": 'Sublet',
							"Distributor": Number(oContributions.SubletSubaruCont),
							"Dealer": Number(oContributions.SubletDealerCont),
							"Customer": Number(oContributions.SubletOwnerCont)
						}
					},
					"Contributions": oContributions,
					"Balanced": false
				};
				oModel.setData(contribs);
				//this._checkContributions();
			}
			var allOk = this._checkDataComplete();
			this.getModel('viewModel').setProperty('/isReadyToSubmit', allOk);
		},
		contribTotalFormatter: function (arg1, arg2, arg3) {
			return [Number(arg1) || 0, Number(arg2) || 0, Number(arg3) || 0].reduce(function (a, b) {
				return a + b;
			}, 0);
		},
		contribValStateFormatter: function (arg1, arg2, arg3) {
			var val = this.contribTotalFormatter(arg1, arg2, arg3);
			return val === 100 ? 'Success' : 'Error';
		},
		onContributionChange: function (oEvent) {
			oEvent.getSource().setValue(parseInt(oEvent.getParameter('newValue'), 10).toString());
			var oContrib = oEvent.getSource().getBindingContext('contribModel').getObject();
			if ((
				Number(oContrib.Distributor) +
				Number(oContrib.Dealer) +
				Number(oContrib.Customer)
			) === 100) {
				this._enableMyContribRow(oEvent.getSource(), false);
				var oData = this.getModel('contribModel').getData();
				var oPayload = oData.Contributions;
				oPayload.LaborSubaruCont = oData.Items.Labor.Distributor.toString();
				oPayload.LaborDealerCont = oData.Items.Labor.Dealer.toString();
				oPayload.LaborOwnerCont = oData.Items.Labor.Customer.toString();
				oPayload.PartSubaruCont = oData.Items.Part.Distributor.toString();
				oPayload.PartDealerCont = oData.Items.Part.Dealer.toString();
				oPayload.PartOwnerCont = oData.Items.Part.Customer.toString();
				oPayload.SubletSubaruCont = oData.Items.Sublet.Distributor.toString();
				oPayload.SubletDealerCont = oData.Items.Sublet.Dealer.toString();
				oPayload.SubletOwnerCont = oData.Items.Sublet.Customer.toString();

				var oPath = "/WtyContributions(SalesOrg='" + oPayload.SalesOrg + "',ClaimNr='" + oPayload.ClaimNr + "',ClaimType='" + oPayload.ClaimType +
					"',Version='" + oPayload.Version + "')";
				var fSuccess = this._enableMyContribRow.bind(this, oEvent.getSource(), true);

				// Fire update and use fSuccess as callback
				this._performUpdate(oPath, oPayload, fSuccess, null, true);

			} else {
				this._checkContributions();
			}
		},
		_checkContributions: function () {
			var allOk = true;
			if (this.getModel('contribModel')) {
				var oContrib = this.getModel('contribModel').getData(); //Labor Part Sublet
				if (oContrib && oContrib.Contributions.ClaimType === 'ZAUT') {
					if (
						(
							Number(oContrib.Items.Labor.Distributor) +
							Number(oContrib.Items.Labor.Dealer) +
							Number(oContrib.Items.Labor.Customer)
						) === 100 &&
						(
							Number(oContrib.Items.Part.Distributor) +
							Number(oContrib.Items.Part.Dealer) +
							Number(oContrib.Items.Part.Customer)
						) === 100 &&
						(
							Number(oContrib.Items.Sublet.Distributor) +
							Number(oContrib.Items.Sublet.Dealer) +
							Number(oContrib.Items.Sublet.Customer)
						) === 100) { } else {
						allOk = false;
					}
				}
			}
			this.getModel('viewModel').setProperty('/showContributionError', !allOk);
			return allOk;
		},
		_enableMyContribRow: function (source, enabled) {
			var aCells = source.getParent().getCells();
			for (var i = 0; i < aCells.length; i++) {
				if (aCells[i].getValue) {
					aCells[i].setEnabled(enabled);
				}
			}
			this.mainModel.refresh();
			this.busyDialog.close();
		},
		onExit: function () {
			if (this._oPopover) {
				this._oPopover.destroy();
			}
		},
		_getHeaderPopover: function () {
			try {
				this._oPopover = sap.ui.xmlfragment("hicron.dp.wty.view.headerChangePopover", this);
			} catch (e) { }
			return this._oPopover;
		},
		handlePopoverConfirmButton: function (oEvent) {
			var aElements = this._oPopover.findElements(true);
			var oElement;
			var oPayload = {};

			this._addPayloadElement(oPayload, 'ReferenceDate');
			this._addPayloadElement(oPayload, 'ReferenceNr');
			this._addPayloadElement(oPayload, 'Mileage');
			this._addPayloadElement(oPayload, 'MileageUOM');
			this._addPayloadElement(oPayload, 'SymptomCode');
			this._addPayloadElement(oPayload, 'TroubleCode');
			if (this.partsInvoiceDateVisible(this.getView().getBindingContext().getObject().ClaimType)) {
				this._addPayloadElement(oPayload, 'PartsInvoiceDate');
			}
			this._addPayloadElement(oPayload, 'LocationGridCode');
			this._addPayloadElement(oPayload, 'DiagnosisTroubleCode');

			oPayload.ReferenceDateString = this.translateDateToStr(oPayload.ReferenceDate);

			this._oPopover.close();
			this.onExit();
			this._performUpdate(oEvent.getSource().getBindingContext().getPath(), oPayload);
		},
		_addPayloadElement: function (oPayload, sElement) {
			var sId = 'id' + sElement; //sElement.charAt(0).toLowerCase() + sElement.slice(1);
			var oId = this._findElementIn(sId, this._oPopover.findElements(true));

			if (oId) {
				try {
					oPayload[sElement] = this.formatter.TZOffsetDate(oId.getDateValue());
					oPayload[sElement].setHours(12);
				} catch (err1) {
					if (oId.getSelectedKey) {
						oPayload[sElement] = oId.getSelectedKey();
					}
					if (typeof oPayload[sElement] === undefined || oPayload[sElement] === "") {
						oPayload[sElement] = oId.getValue();
					}
				}
			}
		},

		handlePopoverCancelButton: function (oEvent) {
			this._oPopover.close();
		},
		onVINPressed: function (oEvent) {
			/*this.getRouter().navTo("vindetail", {
			  vehiclePath: this.getView().getBindingContext().getProperty("VIN") //getPath().substr(1)
			});*/
			var sParam = this.getView().getBindingContext().getProperty("VIN"),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"), // get a handle on the global XAppNav service
				hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
					target: {
						semanticObject: "ZDPVehicles",
						action: "display"
					},
					params: {
						"vin": sParam
					}
				})) || "";
			oCrossAppNavigator.toExternal({
				target: {
					shellHash: hash
				}
			});

		},
		onTitleSelectorPress: function (oEvent) {
			var _oPopover = this._getHeaderPopover();
			// this.getView().addDependent(_oPopover);
			this.myView.addDependent(_oPopover);
			_oPopover.setModel(this.getView().getModel());
			_oPopover.openBy(oEvent.getParameter("domRef"));

			this._handleTrbCode(sap.ui.getCore().byId('idTroubleCode'));
			this._handleSympCode(sap.ui.getCore().byId('idSymptomCode'));

		},
		checkKms: function (oEvent) {
			var oSource = oEvent.getSource();
			var isInt = this.formatter.isInteger(oSource.getValue());
			oSource.setValueState(isInt ? 'None' : 'Error');
		},
		isCustomerInchcape: function (value) {
			return this.myComponent.Customer === 'Inchcape';
		},
		onTextFieldLiveChange: function (oEvent) {
			this.getView().byId('saveTextsButton').setEnabled(true).setType('Reject');
			this.getModel('viewModel').setProperty('/isReadyToSubmit', false);
		},
		onTextFieldChange: function (oEvent) {
			var oTextField = oEvent.getSource();
			var sElement = oTextField.getId().split('--')[1];

			this.mainModel.setProperty(
				this.getView().getBindingContext().getPath() + '/' + sElement.charAt(0).toUpperCase() + sElement.slice(1),
				oEvent.getSource().getValue());
			//this.getView().byId('saveTextsButton').setEnabled(true).setType('Reject');
		},
		updateModelTexts: function (textFieldId) {
			var oTextBox = this.getView().byId(textFieldId),
				sElement = oTextBox.getId().split('--')[1],
				sValueTextBox = oTextBox.getValue();
			this.mainModel.setProperty(
				this.getView().getBindingContext().getPath() + '/' + sElement.charAt(0).toUpperCase() + sElement.slice(1),
				sValueTextBox);
		},
		onSaveTexts: function (oEvent) {
			// go through all text fields and change model accordingly
			for (var i = 0; i < this._textMap.length; i++) {
				this.updateModelTexts(this._textMap[i]);
			}
			this.getView().setBusy(true);
			var context = this;
			this.mainModel.submitChanges({
				success: function (oData) {
					context.mainModel.refresh(true);
					context.busyDialog.close();
				},
				error: function (oError) {
					this.busyDialog.close();
					this.gatewayError(oError);
				}.bind(this)
			});
		},
		_submitChangesSuccess: function (oData) { // Callbacks don't work unless mode uses batch mode

		},
		onItemPress: function (oEvent) {
			var oItem = oEvent.getSource().getBindingContext().getObject();
			if (oItem) {
				if (!this._oMaterialPopover) {
					this._oMaterialPopover = sap.ui.xmlfragment("hicron.dp.wty.view.MaterialPopover", this);
					this.myView.addDependent(this._oMaterialPopover);
				}
				this._oMaterialPopover.bindElement({
					path: "/Materials('" + oItem.Material + "')",
					parameters: {
						expand: 'MatPrices'
					}
				});
				this._oMaterialPopover.openBy(oEvent.getSource());
			}
		},
		materialPopoverGo: function (oEvent) {
			this.materialPopoverClose();
			var oItem = oEvent.getSource();
			if (oItem) {
				// this.myRouter.navTo("partsdetail", {
				//   materialPath: oItem.getBindingContext().getPath().substr(1)
				// });
				var sParam = oItem.getBindingContext().getPath().substr(1),
					oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"),
					hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
						target: {
							semanticObject: "ZDPParts",
							action: "display"
						},
						params: {
							"parts": sParam
						}
					})) || "";
				oCrossAppNavigator.toExternal({
					target: {
						shellHash: hash
					}
				});
			}
		},
		materialPopoverClose: function (oEvent) {
			this._oMaterialPopover.close();
		},
		onItemAdd: function (oEvent) {
			var claimType = this.getView().getBindingContext().getObject().ClaimType;

			if (claimType !== 'ZZPC') {
				var oButton = oEvent.getSource();
				// create action sheet only once
				if (!this._actionSheet) {
					this._actionSheet = sap.ui.xmlfragment(
						"hicron.dp.wty.view.addItemActionSheet",
						this
					);
					this.myView.addDependent(this._actionSheet);
				}
				this._actionSheet.openBy(oButton);
			} else {
				this.onItemAddMaterial(oEvent);
			}
		},
		onDialogCancel: function () {
			try {
				this._oDialog.close().destroy();
			} catch (err) { }
		},
		addCausalPart: function (oEvent) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.addCausalPartDialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();
		},
		addCausalLabor: function (oEvent) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.addCausalLaborDialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();
		},
		onItemAddMaterial: function (oEvent) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("encollab.dp.common.addMaterialDialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();
		},
		onAddMaterialSearch: function (oEvent) {
			var oList = this._findElementIn('addMaterialList', this._oDialog.findElements(true));
			var filters = [];
			var searchString = oEvent.getSource().getValue();

			if (searchString && searchString.length > 3) {
				filters = [
					new Filter("MaterialDescUpper", FilterOperator.Contains, searchString.toUpperCase()),
					new Filter("MaterialNr", FilterOperator.Contains, searchString.toUpperCase())
				];
				oList.bindItems({
					path: "/Materials",
					parameters: {
						select: "MaterialNr,MatlDesc"
					},
					template: sap.ui.xmlfragment("encollab.dp.common.addMaterialTemplate"),
					filters: [
						new Filter("SalesOrg", FilterOperator.EQ, this.myComponent.getMySettingValue('VKO')),
						new Filter("MatlType", FilterOperator.EQ, 'HAWA'),
						new Filter(filters, false)
					]
				});
			}
		},
		onAddLabourSearchRefresh: function () {
			var searchField = this.getView().byId("searchField");
			if (searchField.getValue) {
				if (searchField.getValue.length > 3) this.onAddLabourSearch();
			}
		},
		onAddLabourSearch: function (oEvent) {
			var oList = this._findElementIn('addLabourList', this._oDialog.findElements(true));
			var filters = [];
			var searchString = oEvent.getSource().getValue();
			//var searchString = this.getView().byId("searchField");

			if (searchString && searchString.length > 3) {
				filters = [
					new Filter("FlatRateCodeName", FilterOperator.Contains, searchString.toUpperCase()),
					new Filter("FlatRateCode", FilterOperator.Contains, searchString.toUpperCase())
				];
				oList.bindItems({
					path: "FlatRates",
					parameters: {
						select: "FlatRateCode,FlatRateCodeName"
					},
					template: sap.ui.xmlfragment("encollab.dp.common.addLabourTemplate"),
					filters: [
						// new Filter("SalesOrg", FilterOperator.EQ, this.myComponent.getMySettingValue('VKO')),
						// new Filter("MatlType", FilterOperator.EQ, 'HAWA'),
						new Filter(filters, false)
					]
				});
			}
		},
		onAddSundrySearch: function (oEvent) {
			var oList = this._findElementIn('addMaterialList', this._oDialog.findElements(true));
			var filters = [];
			var searchString = oEvent.getSource().getValue();

			if (searchString && searchString.length > 0) {
				filters = [
					new Filter("MaterialDescUpper", FilterOperator.Contains, searchString.toUpperCase()),
					new Filter("MaterialNr", FilterOperator.Contains, searchString.toUpperCase())
				];
				oList.bindItems({
					path: "/Materials",
					parameters: {
						select: "MaterialNr,MatlDesc"
					},
					template: sap.ui.xmlfragment("encollab.dp.common.addMaterialTemplate"),
					filters: [
						new Filter("SalesOrg", FilterOperator.EQ, this.myComponent.getMySettingValue('VKO')),
						new Filter("MatlType", FilterOperator.EQ, 'NLAG'),
						new Filter(filters, false)
					]
				});
			}
		},
		_AddCausal: function (causalPart, qty) {
			var successMsg = this.getText("addCausalDialogSuccessMsg");

			var oOrder = this.myView.getBindingContext().getObject();
			this.onDialogCancel();
			this.busyDialog.open();
			var new_qty = '1';

			if (oOrder.ClaimType.substring(2, 2) == 'CF' || oOrder.ClaimType.substring(2, 2) == 'SP' || oOrder.ClaimType == 'ZREC' ||
				oOrder.ClaimType == 'ZCAM' || oOrder.ClaimType == 'ZZ1F' || oOrder.ClaimType == 'ZZPC') {
				new_qty = '0';
			}

			var mPayload = {
				VersionGUID: oOrder.ICVersionGUID,
				Material: causalPart,
				CausalPart: 'X',
				ItemType: 'MAT',
				Qty: qty || new_qty,
				UoM: 'EA'
			};

			this._createItem(mPayload, successMsg);
		},
		onAddCausalSelect: function (oEvent) {
			var oListItem;
			if (oEvent.sId === 'updateFinished') { // eslint-disable-line
				if (oEvent.getSource().getItems().length === 1) {
					oListItem = oEvent.getSource().getItems()[0];
				} else {
					return;
				}
			} else {
				oListItem = oEvent.getParameter('listItem');
			}

			this._AddCausal(oListItem.getDescription());

		},
		onAddCausalLabourSelect: function (oEvent) {
			var oListItem;
			if (oEvent.sId === 'updateFinished') { // eslint-disable-line
				if (oEvent.getSource().getItems().length === 1) {
					oListItem = oEvent.getSource().getItems()[0];
				} else {
					return;
				}
			} else {
				oListItem = oEvent.getParameter('listItem');
			}

			var successMsg = this.getText("addWtyCausalLaborDialogSuccessMsg");

			var oOrder = this.myView.getBindingContext().getObject();
			this.onDialogCancel();
			this.busyDialog.open();

			var mPayload = {
				VersionGUID: oOrder.ICVersionGUID,
				Material: oListItem.getDescription(),
				ItemType: 'FR',
				Qty: '0',
				UoM: 'EA',
				CausalLabor: 'X'
			};
			this._createItem(mPayload, successMsg);

		},
		onAddMaterialSelect: function (oEvent) {
			var oListItem;
			if (oEvent.sId === 'updateFinished') { // eslint-disable-line
				if (oEvent.getSource().getItems().length === 1) {
					oListItem = oEvent.getSource().getItems()[0];
				} else {
					return;
				}
			} else {
				oListItem = oEvent.getParameter('listItem');
			}
			// get texts
			var successMsg = this.getText("addMaterialDialogSuccessMsg");

			var oOrder = this.myView.getBindingContext().getObject();
			this.onDialogCancel();
			this.busyDialog.open();

			var mPayload = {
				VersionGUID: oOrder.ICVersionGUID,
				Material: oListItem.getDescription(),
				ItemType: 'MAT',
				Qty: '1',
				UoM: 'EA'
			};
			this._createItem(mPayload, successMsg);
		},
		onItemAddSundry: function (oEvent) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.addSundryDialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();

		},
		onAddSundrySelect: function (oEvent) {
			var oListItem;
			if (oEvent.sId === 'updateFinished') { // eslint-disable-line
				if (oEvent.getSource().getItems().length === 1) {
					oListItem = oEvent.getSource().getItems()[0];
				} else {
					return;
				}
			} else {
				oListItem = oEvent.getParameter('listItem');
			}

			// get texts
			var successMsg = this.getText("addMaterialDialogSuccessMsg");

			var oOrder = this.myView.getBindingContext().getObject();
			this.onDialogCancel();
			this.busyDialog.open();

			var mPayload = {
				VersionGUID: oOrder.ICVersionGUID,
				Material: oListItem.getDescription(),
				ItemType: 'ZSUN',
				Qty: '1'
			};

			var funcCallback = jQuery.proxy(function (odata, response) {
				this.busyDialog.close();
				var itemPath = "/WtyItems(guid'" + odata.ItemGUID + "')";
				this._changeItemQtyDialog(itemPath);
				//TODO waiting for details on how to code a sundry item
				this.warningMessage('Sundry Incomplete', 'The code for adding sundry items is not yet complete');
			}, this);

			this._createItem(mPayload, successMsg, funcCallback);
		},
		_createItem: function (mPayload, successMsg, successCallback) {
			if (!successCallback) {
				successCallback = jQuery.proxy(function (odata, response) {
					this.busyDialog.close();
					this.mainModel.refresh();
					MessageToast.show(successMsg || 'Success');
				}, this);
			}
			this.resetMessagePopover();
			this.mainModel.create("/WtyItems", mPayload, {
				success: successCallback,
				error: jQuery.proxy(function (oError) {
					this.busyDialog.close();
					this.gatewayError(oError);
				}, this)
			});
		},
		onItemAddFlatRate: function (oEvent) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.addFlatrateDialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);

			this._oDialog.open();
		},
		onFlatRateSelect: function (oEvent) {
			var oListItem;
			if (oEvent.sId === 'updateFinished') { // eslint-disable-line
				if (oEvent.getSource().getItems().length === 1) {
					oListItem = oEvent.getSource().getItems()[0];
				} else {
					return;
				}
			} else {
				oListItem = oEvent.getParameter('listItem');
			}

			var successMsg = this.getText("addFlatrateDialogSuccessMsg");

			var oOrder = this.myView.getBindingContext().getObject();
			this.onDialogCancel();
			this.busyDialog.open();

			var mPayload = {
				VersionGUID: oOrder.ICVersionGUID,
				Material: oListItem.getDescription(),
				ItemType: 'FR',
				Qty: '1',
				UoM: 'EA'
			};
			this._createItem(mPayload, successMsg);

		},
		onItemAddSublet: function (oEvent) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.addSubletDialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);
			this.onSubletFieldChange();
			this._oDialog.open();
		},
		onSubletFieldChange: function (oEvent) {
			var allOk = true;
			var oElements = this._oDialog.findElements(true);
			var oSubletDesc = this._findElementIn('subletDesc', oElements);
			// var oSubletQty = this._findElementIn('subletQty', oElements);
			var oSubletValue = this._findElementIn('subletValue', oElements);
			var oSubletUploader = this._findElementIn('subletUploader', oElements);
			var oSubletCodeCatalog = this._findElementIn('subletCodeCatalog', oElements);

			if (oSubletDesc.getValue().length > 0) {
				oSubletDesc.setValueState("Success");
			} else {
				oSubletDesc.setValueState("Error");
				allOk = false;
			}

			if (oSubletCodeCatalog.getValue().length > 0) {
				oSubletCodeCatalog.setValueState("Success");
			} else {
				oSubletCodeCatalog.setValueState("Error");
				allOk = false;
			}

			// if (oSubletQty.getValue().length > 0 && !isNaN(oSubletQty.getValue())) {
			// 	oSubletQty.setValueState("Success");
			// } else {
			// 	oSubletQty.setValueState("Error");
			// 	allOk = false;
			// }
			if (oSubletValue.getValue().length > 0) {
				oSubletValue.setValueState("Success");
			} else {
				oSubletValue.setValueState("Error");
				allOk = false;
			}
			if (oSubletUploader.getValue().length > 0) {
				oSubletUploader.setValueState("Success");
			} else {
				oSubletUploader.setValueState("Error");
				allOk = false;
			}
			this._findElementIn('subletConfirmButton', this._oDialog.getButtons()).setEnabled(allOk);

		},
		onSubletConfirm: function (oEvent) {
			// get texts
			var successMsg = this.getText("addSubletDialogSuccessMsg");

			var oElements = this._oDialog.findElements(true);
			var oSubletDesc = this._findElementIn('subletDesc', oElements);
			// var oSubletQty = this._findElementIn('subletQty', oElements);
			var sSubletQty = "1";
			var oSubletValue = this._findElementIn('subletValue', oElements);
			var oOrder = this.myView.getBindingContext().getObject();
			var oSubletCodeCatalog = this._findElementIn('subletCodeCatalog', oElements);
			//this._oDialog.close();
			this.busyDialog.open();

			var mPayload = {
				VersionGUID: oOrder.ICVersionGUID,
				ClaimItemShortText: oSubletDesc.getValue(),
				ItemType: 'SUBL',
				Qty: sSubletQty,
				UoM: 'EA',
				ValueIC: oSubletValue.getValue(),
				ItemKey: oSubletCodeCatalog.getValue()
			};
			this._createItem(mPayload, successMsg, jQuery.proxy(this.uploadSubletAttachment, this));

		},

		handleValueHelp: function (oEvent) {
			var sInputValue = oEvent.getSource().getValue();

			this.inputId = oEvent.getSource().getId();
			// create value help dialog
			if (!this._valueHelpDialog) {
				this._valueHelpDialog = sap.ui.xmlfragment(
					"hicron.dp.wty.view.subletCodeCatDialog",
					this
				);
				this.getView().addDependent(this._valueHelpDialog);
			}

			// create a filter for the binding
			this._valueHelpDialog.getBinding("items").filter([new Filter(
				"Katnr",
				FilterOperator.Contains, sInputValue
			),
			new Filter(
				"Ltext",
				FilterOperator.Contains, sInputValue
			)]);

			// open value help dialog filtered by the input value
			this._valueHelpDialog.open(sInputValue);
		},

		_handleValueHelpSearchSubCat: function (evt) {
			var sValue = evt.getParameter("value");
			var oFilter1 = new Filter(
				"Katnr",
				FilterOperator.Contains, sValue
			);
			var oFilter2 = new Filter(
				"Ltext",
				FilterOperator.Contains, sValue
			);
			evt.getSource().getBinding("items").filter([oFilter1, oFilter2]);
		},

		_handleValueHelpCloseSubCat: function (evt) {
			var oSelectedItem = evt.getParameter("selectedItem");
			if (oSelectedItem) {
				var subletCodeInput = sap.ui.getCore().byId(this.inputId),
					sTitle = oSelectedItem.getTitle();

				subletCodeInput.setSelectedKey(sTitle);
			}
			evt.getSource().getBinding("items").filter([]);
			this.onSubletFieldChange();
		},

		// suggestionItemSelected: function (evt) {

		// 	var oItem = evt.getParameter('selectedItem'),
		// 		oText = this.byId('selectedKey'),
		// 		sKey = oItem ? oItem.getKey() : '';

		// 	oText.setText(sKey);
		// },

		uploadSubletAttachment: function (odata, response) {
			var oElements = this._oDialog.findElements(true);
			var oSubletDesc = this._findElementIn('subletDesc', oElements);
			var oSubletUploader = this._findElementIn('subletUploader', oElements);

			var sSlug = oSubletUploader.getValue() + '|' + oSubletDesc.getValue();

			oSubletUploader.setUploadUrl("/sap/opu/odata/sap/ZDP151_WARRANTY_ENQUIRY_REDEF_SRV/WtyItems(guid'" + odata.ItemGUID +
				"')/WtyItemAttachments");
			oSubletUploader.addHeaderParameter(new FileUploaderParameter({
				name: 'Slug',
				value: sSlug
			}));
			this.resetMessagePopover();
			this.mainModel.refreshSecurityToken(
				jQuery.proxy(function (oUploader) {
					var csrf = this.mainModel.getSecurityToken();
					oUploader.addHeaderParameter(new FileUploaderParameter({
						name: 'x-csrf-token',
						value: csrf
					}));
					oUploader.upload();
				}, this, oSubletUploader));

		},
		handleSubletUploadComplete: function (oEvent) {
			this.onDialogCancel();
			this.mainModel.refresh();
			this.busyDialog.close();
		},
		onItemDelete: function (oEvent) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("encollab.dp.common.itemDeleteDialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();
		},
		onDeleteDialogConfirm: function (oEvent) {
			// get texts
			var successMsg = this.getText("deleteItemDialogSuccessMsg");

			var sPath = oEvent.getSource().getBindingContext().getPath();
			this.onDialogCancel();
			this.busyDialog.open();
			this.resetMessagePopover();
			this.mainModel.remove(sPath, {
				success: jQuery.proxy(function (odata, response) {
					this.busyDialog.close();
					MessageToast.show(successMsg);
					this.mainModel.refresh();
				}, this),
				error: jQuery.proxy(function (oError) {
					this.busyDialog.close();
					this.gatewayError(oError);
				}, this)
			});
		},
		canChangeQty: function (guid, changeable) {
			var data = this.getView().getBindingContext().getObject();
			var oItem = this.getView().getModel().getProperty("/WtyItems(guid'" + guid + "')");

			if (!data) return false;
			if (!guid) return false;

			if (['B001', 'ZRTN'].indexOf(data.ProcessingStatus) >= 0 && oItem.ItemType === 'ZSUN' && data.Plant === '6411') return true;

			return this.isChangeable();
			//this bit was originally disabled by not calling this method in the view. it just checked 'isChangeable'
			//return this.isChangeable('test') && (oItem.ItemType !== 'FR' || ((oItem.ItemType === 'FR') && oItem.OpCodeEditable === true))
		},
		canChangeValue: function (guid, changeable) {
			var data = this.getView().getBindingContext().getObject();
			var oItem = this.getView().getModel().getProperty("/WtyItems(guid'" + guid + "')");

			if (!data) return false;
			if (!guid) return false;

			if (['B001', 'ZRTN'].indexOf(data.ProcessingStatus) >= 0 && oItem.ItemType === 'ZSUN' && data.Plant === '6411') return true;

			return changeable && (oItem.ItemType === 'SUBL' || oItem.ItemType === 'ZSUN');
		},
		onChangeItemQty: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext();
			var oData = oContext.getObject();
			//console.log(oData);
			if ((oData.OpCodeEditable === false && (oData.ItemType !== 'MAT' && oData.ItemType !== 'ZSUN')) || oData.CausalPart === "X") { // Causal items can only have qty 0 or 1
				this._performUpdate(oContext.getPath(), {
					'Qty': oData.Qty === '0.000' ? '1' : '0'
				});
			} else {
				if (oData.UoM === 'H') {
					this._changeItemHoursDialog(oContext.getPath());
				} else {
					this._changeItemQtyDialog(oContext.getPath());
				}
			}
		},
		_changeItemQtyDialog: function (path) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.changeQtyDialog", this);
			this._oDialog.bindElement({
				path: path
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();
		},
		_changeItemHoursDialog: function (path) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.changeHoursDialog", this);
			this._oDialog.bindElement({
				path: path
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();
		},
		Hours: function (hours) {
			var date = new Date(hours * 3600 * 1000);
			return ('0' + date.getUTCHours()).slice(-2) + ':' +
				('0' + date.getUTCMinutes()).slice(-2);
		},
		onQtyLiveChange: function (oEvent) {
			var oConfirm = this._findElementIn('confirmButton', this._oDialog.getButtons());
			if (oEvent.getParameter('newValue') > 0) {
				oConfirm.setEnabled(true);
				oEvent.getSource().removeStyleClass('qtyError');
			} else {
				oConfirm.setEnabled(false);
				oEvent.getSource().addStyleClass('qtyError');
			}
		},
		onQtyDialogConfirm: function (oEvent) {

			var oInput = this._findElementIn('newQty', this._oDialog.findElements(true));
			var sPath = oEvent.getSource().getBindingContext().getPath();

			this.onDialogCancel();
			this._performUpdate(sPath, {
				'Qty': oInput.getValue()
			});
		},
		onHoursDialogConfirm: function (oEvent) {
			var oInput = this._findElementIn('newHours', this._oDialog.findElements(true));
			var aHours = oInput.getValue();
			// var aHours = oInput.getValue().split(':');
			// var hours = Number(parseFloat(parseInt(aHours[0], 10) + parseInt(aHours[1], 10) / 60).toFixed(3));
			this.onDialogCancel();
			this._performUpdate(oEvent.getSource().getBindingContext().getPath(), {
				'Qty': String(aHours)
			});
		},
		HoursNew: function (value) {
			return parseFloat(value).toFixed(2);
		},
		onChangeItemValue: function (oEvent) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.changeValueDialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();
		},
		onValueLiveChange: function (oEvent) {
			var oConfirm = this._findElementIn('confirmButton', this._oDialog.getButtons());
			if (oEvent.getParameter('newValue') > 0) {
				oConfirm.setEnabled(true);
				oEvent.getSource().removeStyleClass('qtyError');
			} else {
				oConfirm.setEnabled(false);
				oEvent.getSource().addStyleClass('qtyError');
			}
		},
		onValueDialogConfirm: function (oEvent) {
			var oInput = this._findElementIn('newValue', this._oDialog.findElements(true));
			var sPath = oEvent.getSource().getBindingContext().getPath();

			this.onDialogCancel();
			this.busyDialog.open();

			this._performUpdate(sPath, {
				'ValueIC': oInput.getValue()
			});
		},
		checkSublets: function (oEvent) {
			var oModel = this.getView().getBindingContext().getModel();
			var oWtyItems = this.getView().getBindingContext().getObject().WtyItems.__list;
			var oItem = {};
			var iSubletCount = 0;
			for (var i = 0; i < oWtyItems.length; i++) {
				oItem = oModel.oData[oWtyItems[i]];
				if (oItem.ControllingItemType === "SUBL") iSubletCount++;
			}
			if (this.getView().byId('idWtyAttachments').getItems().length < iSubletCount) return false;
			else return true;
		},
		messageBoxPopupError: function () {
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.error(
				"Add proper attachments to all Sublets!", {
				styleClass: bCompact ? "sapUiSizeCompact" : ""
			}
			);
			this.getView().byId('attachTab').setIconColor("Critical");
		},
		onClaimSubmit: function (oEvent) {
			var bReturn = this.checkSublets(oEvent);
			if (!bReturn) {
				this.messageBoxPopupError();
				return;
			}
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.claimSubmitDialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();
		},
		onSubmitClaimDialogConfirm: function (oEvent) {
			this.onDialogCancel();
			this.busyDialog.open();

			var bUsedBatch = this.mainModel.bUseBatch; // eslint-disable-line
			this.mainModel.setUseBatch(true);
			if (this.mainModel.hasPendingChanges()) {
				//<--- For now this part of code is not using =====================
				// There is needed to do a change from the backend side.
				this.mainModel.submitChanges({
					success: jQuery.proxy(function (oData) {
						var oResponse = oData.__batchResponses[0].response;
						this.mainModel.setUseBatch(bUsedBatch);
						if (typeof oResponse !== "undefined" && (oResponse.statusCode === "400" || oResponse.statusCode === "500")) {
							this.busyDialog.close();
							this.gatewayError(oResponse, true);
							return;
						}
						this._performAction('ZSB2', this.getText("submitWtyDialogSuccessMsg"));
					}, this),
					error: function (oError) {
						this.mainModel.setUseBatch(bUsedBatch);
						this.busyDialog.close();
						this.gatewayError(oError);
					}.bind(this)
				});
				//<-- =============================================================
			} else {
				this.mainModel.setUseBatch(bUsedBatch);
				this._performAction('ZSB2', this.getText("submitWtyDialogSuccessMsg"));
			}
		},

		onPartsSent: function (oEvent) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.partsSentDialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();

		},
		onPartsSentDialogConfirm: function (oEvent) {
			this._performAction('ZCN2');
		},
		onClaimAmend: function (oEvent) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.claimAmendDialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();
		},
		onAmendClaimDialogConfirm: function (oEvent) {
			this._performAction('ZRTN', this.getText("amendWtyDialogSuccessMsg"));
		},
		_performAction: function (action, successMsg, fSuccess, fFailure) {
			if (!successMsg) {
				successMsg = this.getText("successMsg");
			}
			if (!fSuccess) {
				fSuccess = function (oData, response) {
					MessageToast.show(successMsg);
					//  For some reason a model refresh didn't work for the buttons
					//this.mainModel.refresh();
					//this.mainModel.updateBindings(true);
					this.busyDialog.close();
					location.reload(); // eslint-disable-line
				};
			}
			if (!fFailure) {
				fFailure = function (oError) {
					this.gatewayError(oError);
					this.busyDialog.close();
				};
			}

			this.busyDialog.open();
			this.onDialogCancel();

			var oClaim = this.myView.getBindingContext().getObject();
			var oParams = {
				WtyAction: action,
				WtyClaimNumber: oClaim.ClaimNr
			};
			this.resetMessagePopover();
			this.mainModel.callFunction("/WtyClaimAction", {
				method: 'POST',
				urlParameters: oParams,
				success: fSuccess.bind(this),
				error: fFailure.bind(this)
			});
		},
		onClaimCreate: function (oEvent) { // This is creating claim from PWA claim
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.createFromPWADialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);

			var oSelect = this._findElementIn('claimTypeSelect', this._oDialog.findElements(true));

			var oTemplate = new Item({
				key: "{PWACategory}",
				text: "{PWACategory}-{PWACategoryDesc}"
			});
			oSelect.bindAggregation('items', {
				path: "PWAClaimTypes",
				template: oTemplate
			});
			this._oDialog.open();
		},
		onClaimCreateSelect: function (oEvent) {
			// get texts
			var successMsg = this.getText("createFromPWADialogSuccessMsg");

			var oSelect = this._findElementIn('claimTypeSelect', this._oDialog.findElements(true));
			var oClaim = this.myView.getBindingContext().getObject();
			this.onDialogCancel();

			var oParams = {
				WtyClaimNumber: oClaim.ClaimNr,
				WtyClaimType: oSelect.getSelectedKey()
			};
			this.resetMessagePopover();
			this.mainModel.callFunction("/WtyClaimCopy", {
				method: 'GET',
				urlParameters: oParams,
				success: $.proxy(function (oData, response) {
					MessageToast.show(successMsg);
					this.busyDialog.close();
					this.myRouter.navTo("wtydetail", {
						wtyPath: "WtyHeaders(guid'" + oData.results[0].GUID + "')"
					});
				}, this),
				error: $.proxy(function (oError) {
					this.gatewayError(oError);
				}, this)
			});
		},
		onPWACreate: function (oEvent) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.pwaCreateDialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();
		},
		onPwaCreateDialogConfirm: function (oEvent) {
			var fSuccess = function (oData, response) {
				MessageToast.show(this.getText("deleteWtyDialogSuccessMsg"));
				this.busyDialog.close();
				this.myRouter.navTo("wtydetail", {
					wtyPath: "WtyHeaders(guid'" + oData.GUID + "')"
				});
			};
			this._performAction('ZC2P', null, fSuccess);
		},
		onClaimDelete: function (oEvent) {
			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.claimDeleteDialog", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();
		},
		onDeleteOrderDialogConfirm: function (oEvent) {
			this._performAction('ZCNC', this.getText("deleteWtyDialogSuccessMsg"));
		},
		onAttachUploadChange: function (oEvent) {
			var csrf = this.mainModel.getSecurityToken();
			var oUploader = oEvent.getSource();
			var fileName = oEvent.getParameter('files')[0].name;
			if (oEvent.getParameter('files')[0].size > 10 * 1048576) { //1 KiB = 1024 B : 100 KiB = 102400 B : 1MB = 1 048 576 B 
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				MessageBox.error(
					"File size is greater than 10MB. Upload process has been cancelled!", {
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				}
				);
				return;
			}
			oUploader.removeAllHeaderParameters();
			oUploader.insertHeaderParameter(new UploadCollectionParameter({
				name: 'x-csrf-token',
				value: csrf
			}));
			oUploader.insertHeaderParameter(new UploadCollectionParameter({
				name: 'Slug',
				value: fileName
			}));
			this.mainModel.refresh();
		},
		onAttachDelete: function (oEvent) {
			var sPath = oEvent.getParameter('item').getBindingContext().getPath();
			var oModel = this.mainModel;
			this.busyDialog.open();
			this.resetMessagePopover();
			oModel.remove(sPath, {
				success: jQuery.proxy(function (odata, response) {
					this.busyDialog.close();
					oModel.refresh();
				}, this),
				error: jQuery.proxy(function (oError) {
					this.busyDialog.close();
					this.gatewayError(oError);
				}, this)
			});
			var allOk = this._checkDataComplete();
			this.getModel('viewModel').setProperty('/isReadyToSubmit', allOk);
			this.mainModel.refresh();
		},
		onAttachUploadComplete: function (oEvent) {
			this.getView().byId('attachTab').setIconColor("Default");
			this.mainModel.refresh();
		},
		headerUrl: function (guid) {
			return this.mainModel.sServiceUrl + "/WtyHeaders(guid'" + guid + "')";
		},
		onPartsReturnPress: function (oEvent) {
			//create model
			this.getView().setModel(new JSONModel(), "consign");
			this._initializeConsignment();

			// create dialog
			this.onDialogCancel();
			this._oDialog = sap.ui.xmlfragment("hicron.dp.wty.view.addConsignment", this);
			this._oDialog.bindElement({
				path: oEvent.getSource().getBindingContext().getPath()
			});
			this._oDialog.bindElement({
				model: 'consign',
				path: '/'
			});
			this.myView.addDependent(this._oDialog);
			this._oDialog.open();
		},
		onConsChange: function (oEvent) {
			var oCons = oEvent.getSource().getBindingContext('consign').getObject();
			if (
				oCons.ConsignmentNote.length > 0 &&
				Number(oCons.NofCartons) > 0 &&
				Number(oCons.GrossWeight) > 0 &&
				oCons.Dimensions.length > 0 &&
				oCons.FreightProvider.length > 0
			) {
				oCons.ReadyToSubmit = true;
			} else {
				oCons.ReadyToSubmit = false;
			}
		},
		onConsignmentCreate: function (oEvent) {
			var oCons = oEvent.getSource().getBindingContext('consign').getObject();
			var oPayload = {
				Clmno: this.getView().getBindingContext().getObject().ClaimNr,
				ConsignmentNote: oCons.ConsignmentNote,
				NofCartons: oCons.NofCartons,
				GrossWeight: oCons.GrossWeight,
				Dimensions: oCons.Dimensions,
				FreightProvider: oCons.FreightProvider
			};

			this._oDialog.close();
			this.busyDialog.open();
			this.resetMessagePopover();
			this.mainModel.create("/WtyConsignments", oPayload, {
				success: jQuery.proxy(function (odata, response) {
					this.mainModel.refresh();
					this.busyDialog.close();
				}, this),
				error: jQuery.proxy(function (oError) {
					this.busyDialog.close();
					this.gatewayError(oError);
				}, this)
			});
		},
		_initializeConsignment: function () {
			this.getView().getModel("consign").setData({
				Clmno: this.getView().getBindingContext().getObject().ClaimNr,
				ConsignmentNote: "Test",
				NofCartons: "",
				GrossWeight: "",
				Dimensions: "",
				FreightProvider: "",
				Material: "",
				ReadyToSubmit: false
			});
		},
		partsInvoiceDateVisible: function (claimType) {
			if (this.myComponent.Customer === 'Inchcape') {
				var partsClaimTypes = [];
				partsClaimTypes.ZAUT = true;
				partsClaimTypes.ZZPW = true;
				partsClaimTypes.ZZPC = true;

				return partsClaimTypes[claimType] === true;

			} else {
				return false;
			}
		},
		_performUpdate: function (sPath, sPayload, fSuccess, fError, noBusy) {
			if (!noBusy) this.busyDialog.open();
			if (!fSuccess) {
				fSuccess = jQuery.proxy(function (odata, response) {
					this.mainModel.refresh();
					this.busyDialog.close();
				}, this);
			}
			if (!fError) {
				fError = jQuery.proxy(function (oError) {
					this.busyDialog.close();
					this.gatewayError(oError);
				}, this);
			}
			this.resetMessagePopover();
			this.mainModel.update(sPath, sPayload, {
				merge: true,
				success: fSuccess,
				error: fError
			});
		},
		formURL: function (claimNr, objType) {
			return this.getModel().sServiceUrl + "/WtyForms(ClaimNr='" + claimNr + "',ObjType='" + objType + "')/Print/$value";
		},
		onNavBack: function () {
			Controller.prototype.onNavBack.apply(this, ["wty"]);
		},
		MileageRefresh: function (oEvent) {
			var oPopup = this.getView().mAggregations.dependents[0]; // eslint-disable-line
			var oModel = oPopup.getModel();
			oModel.refresh(true);
		},

		isValidDate: function (value) {
			var sState = 'None';
			var oViewModel = this.getModel("viewModel");
			if (value === null) {
				oViewModel.setProperty('/refDateIsValid', false);
				sState = 'Error';
			}
			if (value > new Date().setHours(12)) {
				sState = 'Error';
				oViewModel.setProperty('/refDateIsValid', false);
			}
			return sState;
		},
		onRefDateChange: function (oEvent) {
			if (this.simplyCheckRepairDate(oEvent) == false) { return; }
			this.checkWarrantyValidity(oEvent);
		},
		simplyCheckRepairDate: function (oEvent) {
			//Repair date can't be in future...
			var now = new Date(),
				dataPickerDate = new Date(oEvent.getSource().getDateValue());
			var oViewModel = this.getModel("viewModel");
			var oElements = this._oPopover.findElements(true);
			if (dataPickerDate > now) {
				//BAD
				var oSubmitButton = this._findElementIn('idHandlePopoverConfirmBtn', oElements);
				oSubmitButton.setEnabled(false);
				var oRefDate = this._findElementIn('idReferenceDate', oElements);
				oRefDate.setValueState('Error');
				oViewModel.setProperty('/refDateIsValid', false);
				return false;
			} else {
				//GOOD
				var oSubmitButton = this._findElementIn('idHandlePopoverConfirmBtn', oElements);
				oSubmitButton.setEnabled(true);
				var oRefDate = this._findElementIn('idReferenceDate', oElements);
				oRefDate.setValueState('None');
				oViewModel.setProperty('/refDateIsValid', true);
				return true;
			}
		},
		translateDateToStr: function (ref12oclock) {
			var day = (ref12oclock.getDate().toString().length == 1) ? ("0" + ref12oclock.getDate().toString()) : ref12oclock.getDate().toString();
			var month = ((ref12oclock.getMonth() + 1).toString().length == 1) ? ("0" + (ref12oclock.getMonth() + 1).toString()) : (ref12oclock.getMonth() + 1).toString();
			return ref12oclock.getFullYear().toString() + month + day;
		},
		checkWarrantyValidity: function (oEvent) {
			var oDataM = this.getModel().getProperty(this.getView().getBindingContext().getPath());
			var sVIN = oDataM.VIN;
			var sClaimType = oDataM.ClaimType;
			var oRefDate = oEvent.getSource().getDateValue();
			var sReferenceDate = new Date(oRefDate);
			var sReferenceDateStr = this.translateDateToStr(oRefDate);
			var oSource = oEvent.getSource();
			var oThis = this;
			var sState = 'None';
			this.bWarrantyValid = false;
			var oViewModel = this.getModel("viewModel");
			oViewModel.setProperty('/refDateIsValid', false);

			this.getModel().callFunction("/CheckWarrantyValidity", {
				method: 'GET',
				urlParameters: {
					"VIN": sVIN,
					"ClaimType": sClaimType,
					"RepairDate": sReferenceDate,
					"RepairDateStr": sReferenceDateStr,
					"Mileage": 0
				},
				success: $.proxy(function (oData, response) {
					if (oData.NotValid === 'X') {
						var sDate = sReferenceDate.toLocaleDateString();
						oThis.popErrorMessage(
							oThis.getText("wtyValidityErrorTitle"),
							oThis.getText("wtyWarrantyValidityError", [oData.GaartTxt, sDate])
						);
						sState = 'Error';
						oSource.setValueState(sState);
						oViewModel.setProperty('/refDateIsValid', false);
					} else {
						if (sReferenceDate > new Date()) {
							sState = 'Error';
							oViewModel.setProperty('/refDateIsValid', false);
						} else {
							sState = 'None';
							oViewModel.setProperty('/refDateIsValid', true);
						}
						oSource.setValueState(sState);
					}
				}),
				error: $.proxy(function (oError) {
					MessageBox.alert(this.gatewayError(oError));
					sState = 'Error';
					oViewModel.setProperty('/refDateIsValid', false);
					oSource.setValueState(sState);
				}, this)
			});
		},


		// _handleSymTrbCategory: function(oSelect){
		//   var sTargetId = oSelect.getId() == 'symptomCategory' ? 'idSymptomCode' : 'idTroubleCode';
		//   var sPath = oSelect.getId() == 'symptomCategory' ? 'SymptomCategory' : 'TroubleCategory';
		//   //{path: 'WtyTroubleCodes>/results', filters: [{path:'TroubleCategory',operator:'NE',value1:''}]}
		//   var oTargetBinding = sap.ui.getCore().byId(sTargetId).getBinding('items');
		//   oTargetBinding.filter([new Filter(sPath, sap.ui.model.FilterOperator.Contains, oSelect.getSelectedKey())]);
		// },
		onSymTrbCategoryChange: function (oEvent) {
			// if($.inArray(oEvent.getSource().getId(), ['symptomCategory','troubleCategory']) > -1 ){
			//   this._handleSymTrbCategory(oEvent.getSource());
			// }

			if ($.inArray(oEvent.getSource().getId(), ['idSymptomCategory', 'idTroubleCategory']) > -1) {
				this._handleSymTrbCategory(oEvent.getSource());
			} else if (oEvent.getSource().getId() === 'idTroubleCode') {
				this._handleTrbCode(oEvent.getSource());
			} else if (oEvent.getSource().getId() === 'idSymptomCode') {
				this._handleSympCode(oEvent.getSource());
			}
		}
	});
});