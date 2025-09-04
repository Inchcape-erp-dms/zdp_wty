sap.ui.define([
    "hicron/dp/wty/controller/BaseController",
    //"encollab/dp/BaseController",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Item",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/MessageToast",
    'sap/m/MessageBox'
], function (Controller, History, JSONModel, Item, Filter, FilterOperator, ODataModel, MessageToast, MessageBox) {
    "use strict";
    return Controller.extend("hicron.dp.wty.controller.Create", {
        _userAuthorisations: ['WarrantyClaims', 'WarrantyCreate'],
        //_userParameters: ['VKO', 'VTW', 'WRK'],

        _partsClaim: false,
        _oStep1Validated: false,
        _oStep2Validated: false,
        _oStep3Validated: false,

        onInit: function () {
            Controller.prototype.onInit.apply(this, arguments);
			this.bWarrantyValid = false;
            this._Customer = this.myComponent.Customer;
            this.getView().setModel(new JSONModel(), "newClaim");
            this.getView().setModel(new JSONModel(), "it");
            this.myRouter.getRoute("createwty").attachPatternMatched(this._onVehicleMatched, this);
            this.myRouter.getRoute("createwtypart").attachPatternMatched(this._onPartMatched, this);
        },
        onAfterViewRendered: function (oEvent) {
            Controller.prototype.onAfterViewRendered.apply(this, arguments);
            window.document.title = 'Create Claim';

            var aCust = this.getModel('core').getProperty("/Users('" + this.getOwnerComponent().getMyId() + "')/Dealers");
            if (!aCust || !aCust.length || aCust.length === 0) {
                this.popErrorMessage('No Dealer', 'This user not linked to a dealer');
                this.getView().getContent()[0].destroyContent();
            }
        },
        _onVehicleMatched: function (oEvent) {
            this._partsClaim = false;
            var sVehiclePath = "/" + oEvent.getParameter("arguments").vehiclePath;
            this._vehiclePath = sVehiclePath;
            this.getView().bindElement({
                model: 'vin',
                path: sVehiclePath
            });
            this.VIN = sVehiclePath.match(/'.*'/)[0].replace(/'/g, '');
            this.getView().setBusy(true);
            this._buildWizard();

            this.getView().byId('createClaimPage').setTitle(
                this.getText('wtyClaimCreateTitle', sVehiclePath.match(/'.*'/))
            );

            this._getTroubleCatAndSymptomCat();
        },
        _getTroubleCatAndSymptomCat: function(){
            var oCont = this;

            this.getView().getModel().read('/WtySymptomCategorySet', {
                success: function (oData) {
                    oCont.getView().setModel(new JSONModel(oData), "WtySymptomCateg");
                    oCont.getView().getModel().read('/WtySymptomCodes', {
                        success: function (oData) {
                            oCont.getView().setModel(new JSONModel(oData), "WtySymptomCodes");
                        }
                    });
                }
            });


            this.getView().getModel().read('/WtyTroubleCategorySet', {
                success: function (oData) {
                    oCont.getView().setModel(new JSONModel(oData), "WtyTroubleCategory");
                    oCont.getView().getModel().read('/WtyTroubleCodes', {
                        success: function (oData) {
                            oCont.getView().setModel(new JSONModel(oData), "WtyTroubleCodes");
                        }
                    });
                }
            });
        },
        _onPartMatched: function (oEvent) {
            this._partsClaim = true;
            var sPartPath = "/" + oEvent.getParameter("arguments").partPath;
            this.getView().bindElement({
                path: sPartPath
            });
            this.getView().setBusy(true);
            this._buildWizard();

            this.getView().byId('createClaimPage').setTitle(
                this.getText('wtyClaimCreateTitle', sPartPath.match(/'.*'/))
            );

            this.getModel('newClaim').setProperty('/ViewData/partsClaim', true);

            this._getTroubleCatAndSymptomCat();
        },
        _buildWizard: function () {
            this.initializeNewClaimData();
            var oPage = this.getView().byId('createClaimPage');

            if (this._wizard) {
                try {
                    this._wizard.destroy();
                } catch (err) {}
            }

            if (this._Customer === 'Inchcape') {
                this._wizard = sap.ui.xmlfragment("hicron.dp.wty.view.wizard", this);
                oPage.addContent(this._wizard);
                // this._updateSelectionTexts();
            } else {
                this._wizard = sap.ui.xmlfragment("hicron.dp.wty.view.standardForm", this);
                oPage.addContent(this._wizard);
                this.getView().byId('onSaveButton').setVisible(true);
            }
            this._getClaimTypes();
            if (!this._partsClaim) {
                this.getView().getModel('vin').read(this.getView().getElementBinding('vin').getPath(), {
                    success: $.proxy(this._readVehicleSucceed, this)
                });
            } else {
                this.getView().setBusy(false);
            }
            this.checkKms();
            this.checkPWA();
        },

        _readVehicleSucceed: function (oEvent) {
            this._setMileage(oEvent);
        },

        _setMileage: function (oEvent) {
            var oKms = this._findElementIn('idKms', this._wizard.findElements(true));
            if (oKms) {
                oKms.data("minKms", oEvent.Mileage ? Number(parseFloat(oEvent.Mileage).toFixed(0)) : 0);
                oKms.setText('Kms > ' + oKms.data().minKms);
            }
            this._findElementIn('idPrtKms', this._wizard.findElements(true)).setDescription('Kms <= Mileage');
            this.getView().setBusy(false);
        },
        initializeNewClaimData: function () {
            var oComponent = this.myComponent;
            this.getModel("newClaim").setData({
                Detail: {
                    ClaimType: this._partsClaim ? 'ZZPC' : oComponent.getMySettingValue('DP_CLAIMTYPE') || '0001',
                    PWACategory: 'ZZGW',
                    PartnerNr: oComponent.getMySettingValue('DP_KUNNR'),
                    Plant: oComponent.getMySettingValue('WRK'),
                    ReferenceDate: null, //new Date(),
                    VIN: null,
                    ReferenceNr: '', //this.getComponent().getMyId(),
                    ClaimSubmissionDate: new Date(),
                    SymptomCode: null,
                    TroubleCode: null,
                    DiagnosisTroubleCode: '',
                    LocationGridCode: '',
                    Mileage: null,
                    MileageUOM: 'KM',
                    PartsInvNo: null,
                    PartsInvoiceDate: null, //new Date(),
                    PartsFittedMlg: ''
                },
                ViewData: {
                    partsClaim: false,
                    vin: '',
                    matnr: ''
                }
            });
            var newClaim = this.getModel('newClaim');
            if (this.isPartsClaim()) {
                newClaim.setProperty('/ViewData/partsClaim', true);
            }
        },
        _getClaimTypes: function () {
            var oClaimTypeSelector = sap.ui.getCore().byId('claimType');
            if (!oClaimTypeSelector) return;
            var filters = [];

            if (this._partsClaim) {
                oClaimTypeSelector.bindItems({
                    path: "/WtyClaimTypes",
                    template: new Item({
                        key: "{ClaimType}",
                        text: "{ClaimTypeDesc}"
                    }),
                    filters: new Filter({
                        filters: [new Filter("ClaimType", FilterOperator.EQ, 'ZZPC')],
                        and: true
                    })
                });
            } else {
                if (this._vehiclePath) {
                    this.refreshClaimType();
                    // solution moved to onAfterViewRendered. U can se it there. PLAMJAKS
                    // oClaimTypeSelector.bindItems({
                    //     model: 'vin',
                    //     path: this._vehiclePath + "/ClaimTypes",
                    //     template: new Item({
                    //         key: "{vin>ClaimType}",
                    //         text: "{vin>ClaimTypeDesc}"
                    //     })
                    // });
                }
            }
        },
        wizardCompletedHandler: function (oEvent) {
        	
            var msg = "",
                bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;

            if (!this.canISave()) {
                var invalidateStep = "";
                if (this._oStep1Validated === false) invalidateStep = "first";
                else if (this._oStep1Validated === false) invalidateStep = "second";
                else if (this._oStep1Validated === false) invalidateStep = "third";
                msg = "Some fields are wrong or missing. Check " + invalidateStep + " step before creating!";
				
                MessageBox.error(
                    msg, {
                        actions: [sap.m.MessageBox.Action.CLOSE],
                        styleClass: bCompact ? "sapUiSizeCompact" : ""
                    }
                );
                
                return;
            }
            var VIN = '';
            if (this.getView().getBindingContext('vin') && this.getView().getBindingContext('vin').getObject()) {
                VIN = this.getView().getBindingContext('vin').getObject().VIN;
            }
            //new Date(mNewClaim.ReferenceDate.setHours(12))

            var mNewClaim = this.getView().getModel("newClaim").getData().Detail;

            if (mNewClaim.Mileage === "" || mNewClaim.Mileage === "0") {
                msg = "Error with Mileage occurred while creating Claim./n Please click Restart and input values again./n Thank you!";
				
                MessageBox.error(
                    msg, {
                        actions: [sap.m.MessageBox.Action.CLOSE],
                        styleClass: bCompact ? "sapUiSizeCompact" : ""
                    }
                );
                return;
            }

            // Inchcape payload data
            var SubmissionDate = new Date(mNewClaim.ClaimSubmissionDate.setHours(12));
            SubmissionDate.setMinutes(0);
            SubmissionDate.setSeconds(0);
            var ref12oclock = new Date(mNewClaim.ReferenceDate.setHours(12));
            var refString = this.convertDateToStr(ref12oclock); 
            var mPayload = {
                ClaimType: mNewClaim.ClaimType,
                PWACategory: mNewClaim.ClaimType === 'ZAUT' ? mNewClaim.PWACategory : '',
                PartnerNr: mNewClaim.PartnerNr,
                Plant: mNewClaim.Plant,
                ReferenceDate: ref12oclock,
                ReferenceDateString: refString,
                VIN: VIN,
                ReferenceNr: mNewClaim.ReferenceNr,
                Mileage: mNewClaim.ClaimType !== 'ZZPC' ? mNewClaim.Mileage : '',
                MileageUOM: mNewClaim.MileageUOM,
                SymptomCode: mNewClaim.SymptomCode,
                TroubleCode: mNewClaim.TroubleCode,
                PartsInvoiceDate: (mNewClaim.PartsInvoiceDate) ? new Date(mNewClaim.PartsInvoiceDate.setHours(12)) : null,
                ClaimSubmissionDate: SubmissionDate,
                LocationGridCode: mNewClaim.LocationGridCode,
                DiagnosisTroubleCode: mNewClaim.DiagnosisTroubleCode,
                PartsInvNo: this.isPartsClaim() ? mNewClaim.PartsInvNo : '',
                PartsFittedMlg: this.isPartsClaim() && mNewClaim.ClaimType !== 'ZZPC' ? mNewClaim.PartsFittedMlg : '',
            };
            this.createClaim(mPayload);
        },
        canISave: function () {
            var mNewClaim = this.getView().getModel("newClaim").getData().Detail;
            if (mNewClaim.ClaimType === 'ZZPC') this._oStep3Validated = true;
            if (this._oStep1Validated === true && this._oStep2Validated === true && this._oStep3Validated === true)
                return true;
            else
                return false;
        },
        onStepActivate: function (oEvent) {
            var iStep = oEvent.getParameter('index');
            var claimType = this.getModel('newClaim').getProperty('/Detail/ClaimType');

            switch (iStep) {
                case 1:
                    if (this.onStep1FieldChange) {
                        this.onStep1FieldChange(oEvent);
                    }
                    break;
                case 2:
                    this._wizard.getSteps()[1].setNextStep(claimType === 'ZZPC' ? 'claimStep4' : 'claimStep3');
                    if (this.onStep2FieldChange) {
                        this.onStep2FieldChange(oEvent);
                    }
                    break;
                case 3:
                    if (this.onStep3FieldChange) {
                        this.onStep3FieldChange(oEvent);
                    }
                    break;
                default:
                    break;
            }
        },
        _updateSelectionTexts: function () {
            var oData = this.getView().getModel('newClaim').getProperty('/Detail');

            var oPath = "/WtySymptomCodes('" + oData.SymptomCode + "')/SymptomCodeName";
            oData.SymptomCodeDesc = this.getView().getModel().getProperty(oPath);
            
            //Old
            // oPath = "/WtyClaimTypes('" + oData.ClaimType + "')/ClaimTypeDesc";
            // oData.ClaimTypeDesc = this.getView().getModel().getProperty(oPath);
            
            //New
            oData.ClaimTypeDesc = this._findElementIn('claimType', this._wizard.findElements(true)).getSelectedItem().getProperty("text");

            oPath = "/WtyTroubleCodes('" + oData.TroubleCode + "')/TroubleCodeName";
            oData.TroubleCodeDesc = this.getView().getModel().getProperty(oPath);

            oPath = "/Dealers('" + oData.PartnerNr + "')/Name";
            oData.PartnerName = this.getModel('core').getProperty(oPath);

            if (this.getView().getBindingContext()) {
                var matData = this.getView().getBindingContext().getObject();
                if (matData.MaterialNr) {
                    this.getView().getModel('newClaim').setProperty('/ViewData/matnr', matData.MaterialNr);
                }
            }
            if (this.getView().getBindingContext('vin')) {
                var vinData = this.getView().getBindingContext('vin').getObject();
                if (vinData.VIN) {
                    this.getView().getModel('newClaim').setProperty('/ViewData/vin', vinData.VIN);
                }
            }
        },
        isValidDate: function (value) {
            if (value === null) {
                return 'Error';
            }
            return value > new Date().setHours(12) ? 'Error' : 'None';
        },
        isPartsClaim: function (args) {
            var mNewClaim = this.getView().getModel("newClaim").getData().Detail;
            return mNewClaim.ClaimType === 'ZZPC' || mNewClaim.ClaimType === 'ZZPW';
        },
        isNotPartsClaim: function (args) {
            return !this.isPartsClaim(args);
        },
        onClaimTypeChange: function (oEvent) {
            var mNewClaim = this.getView().getModel("newClaim").getData().Detail;
            var vPath = "/UserSettings(UserId='" + this.myComponent.getMyId() + "',Name='DP_CLAIMTYPE')";
            this.getModel('core').update(vPath, {
                Value: mNewClaim.ClaimType
            }, {
                merge: true
            });
            //Reset state of pwaCategory
            var pwaCategory = sap.ui.getCore().byId('pwaCategory');
            pwaCategory.setSelectedKey('');
            pwaCategory.setValueState('Error');

            this.getPWACategories(this.VIN, mNewClaim.ClaimType);

            this.getModel('newClaim').setProperty('/ViewData/partsClaim', this.isPartsClaim());
			
			// this.checkWarrantyValidity(oEvent);
            // this.onStep1FieldChange(oEvent);
        },

        getPWACategories: function (VIN, ClaimType) {
            if (ClaimType === 'ZAUT') {
                this.getModel().callFunction("/GetPWACategories", {
                    method: 'GET',
                    urlParameters: {
                        "ClaimType": ClaimType,
                        "VIN": VIN
                    },
                    success: this._PWACategoriesReceived.bind(this),
                    error: $.proxy(function (oError) {
                        MessageBox.alert(this.gatewayError(oError));
                    }, this)
                });
            }
        },

        _PWACategoriesReceived: function (oData) {
            var oModel = new sap.ui.model.json.JSONModel(oData.results);
            var pwaCategory = sap.ui.getCore().byId('pwaCategory');
            var oTemplate = new sap.ui.core.Item({
                key: "{PWACategory}",
                text: "{PWACategoryDesc}"
            });
            pwaCategory.setModel(oModel);
            pwaCategory.bindItems({
                path: "/",
                template: oTemplate
            });
        },

        onDealerChange: function (oEvent) {
            var mNewClaim = this.getView().getModel("newClaim").getData().Detail;
            var vPath = "/UserSettings(UserId='" + this.myComponent.getMyId() + "',Name='DP_KUNNR')";
            this.getModel('core').update(vPath, {
                Value: mNewClaim.PartnerNr
            }, {
                merge: true
            });
            this.onStep1FieldChange(oEvent);
        },
        onRefDateChange: function (oEvent) {
        	this.checkWarrantyValidity(oEvent);
            // this.onStep1FieldChange(oEvent);
        },
        onMileageChange: function(oEvent){
        	this.checkWarrantyValidity(oEvent);
        },
        checkKms: function (oEvent) {
            var allOk = true;
            var claimType = this.getModel('newClaim').getProperty('/Detail/ClaimType');

            if (claimType === 'ZZPC') return true;

            var oKms = sap.ui.getCore().byId('idKmsInput');

            var kmsVal = oKms.getValue();
            sap.ui.getCore().byId('idKmsInput').setValue(parseInt(kmsVal));

            if (
                isNaN(kmsVal) ||
                Number(kmsVal) !== Number(parseInt(kmsVal)) ||
                Number(parseInt(kmsVal)) <= Number(this.getView().getBindingContext('vin').getObject().Mileage)
            ) {
                allOk = false;
            }

            if (allOk) {
                oKms.setValueState('None');
            } else {
                oKms.setValueState('Error');
                oKms.setValueStateText(this.getText('wtyKmsError'));
            }

            return allOk;
        },
        checkPWA: function () {
            var allOk = true;
            var oClaimType = sap.ui.getCore().byId('claimType');
            if(oClaimType.getSelectedKey() === 'ZAUT'){
                var oPWACat = sap.ui.getCore().byId('pwaCategory');
                var PWASelected = oPWACat.getSelectedKey();

                if (oPWACat.getItems().length > 0) {
                    if (PWASelected === '') allOk = false;
                }else allOk = false;
                
                if (allOk) oPWACat.setValueState('None');
                else {
                    oPWACat.setValueState('Error');
                    oPWACat.setValueStateText(this.getText('wtyPWACategoryError'));
                }
            }
            if (allOk)  this.getModel('newClaim').setProperty('/Detail/PWACategory', sap.ui.getCore().byId('pwaCategory').getSelectedKey());
            return allOk;
        },
        onPWACategoryChange: function(){
            this.checkPWA();
            this.onStep1FieldChange();
        },
        PWASelectState: function (value) {
            if (value === "") {
                return 'Error';
            }
            return 'None';
        },
        checkPartsFields: function (oEvent) {
            var allOk = true;

            if (this.isPartsClaim()) {
                var oPrtInv = this._findElementIn('idPrtInv', this._wizard.findElements(true));
                // PartInvoiceNo
                if (oPrtInv.getValue().length > 0) {
                    oPrtInv.setValueState('None');
                } else {
                    oPrtInv.setValueState('Error');
                    allOk = false;
                }

                // PartInvoiceDate
                var oPrtInvDate = this._findElementIn('idPrtInvDate', this._wizard.findElements(true));
                if (
                    oPrtInvDate.getDateValue() &&
                    oPrtInvDate.getDateValue() < this.getModel('newClaim').getProperty('/Detail/ReferenceDate')) {
                    oPrtInvDate.setValueState('None');
                } else {
                    oPrtInvDate.setValueState('Error');
                    var oLabel = this._findElementIn('idDataLabel', this._wizard.findElements(true));
                    oLabel.setText(" < " + this.getModel('newClaim').getProperty('/Detail/ReferenceDate').toDateString());
                    allOk = false;
                }

                if (this.getModel('newClaim').getProperty('/Detail/ClaimType') !== 'ZZPC') {
                    // PartReplacementKms
                    var oKms = this._findElementIn('idKmsInput', this._wizard.findElements(true));
                    var oPrtKms = this._findElementIn('idPrtKms', this._wizard.findElements(true));
                    var kmsVal = oKms.getValue();
                    var kmsPrtVal = oPrtKms.getValue();
                    if (
                        isNaN(kmsPrtVal) ||
                        Number(kmsPrtVal) !== Number(parseFloat(kmsPrtVal).toFixed(0)) ||
                        Number(parseFloat(kmsPrtVal).toFixed(0)) > Number(parseFloat(kmsVal).toFixed(0))
                    ) {
                        oPrtKms.setValueState('Error');
                        allOk = false;
                    } else {
                        oPrtKms.setValueState('None');
                    }
                }
            }
            return allOk;
        },
        onStep1FieldChange: function (oEvent) {
            var allOk = this.checkKms(oEvent) && this.checkPartsFields(oEvent) && this.checkRepairDate(oEvent) && this.checkPWA() && this.bWarrantyValid;

            if (this._Customer === 'Inchcape') {

                var oData = this.getView().getModel('newClaim').getProperty('/Detail');

                if (oData.ReferenceDate > new Date().setHours(12) ) {
                    allOk = false;
                }
                if (oData.ClaimType !== 'ZAUT' && (!oData.ReferenceNr || !oData.ReferenceNr.length)) {
                    allOk = false;
                }
                if (oData.Milage === "" || oData.Milage === "0") {
                    allOk = false;
                }
                if (oData.ClaimType === 'ZAUT'){
                    if (oData.PWACategory === "") allOk = false;
                }

                var oStep1 = this._wizard.getSteps()[0];
                if (allOk) {
                    this._wizard.validateStep(oStep1);
                    this._oStep1Validated = true;
                } else {
                    this._wizard.invalidateStep(oStep1);
                    this._oStep1Validated = false;
                }

                this._updateSelectionTexts();
            } else {
                this.getView().byId('onSaveButton').setEnabled(allOk && this._readyToCreate());
            }
        },
        checkRepairDate: function (oEvent) {
            var oDatePicker = sap.ui.getCore().byId('idDatePick');
            if (oDatePicker.getValue() === "") {
                return false;
            }
            return true;
        },
		
		 checkWarrantyValidity: function(oEvent){
            var mNewClaim = this.getModel("newClaim").getData().Detail;
            var sVIN = "";
            
            if (mNewClaim.ClaimType !== 'ZZPC')
            sVIN = this.getView().getBindingContext('vin').getObject().VIN;
            
            var sClaimType = mNewClaim.ClaimType;
            if(mNewClaim.ReferenceDate === null){
                return;
            }
            var sReferenceDate = new Date(mNewClaim.ReferenceDate.setHours(12));
            var oThis = this;
            
            this.bWarrantyValid = false;
            this.onStep1FieldChange(oEvent);
            
            if (mNewClaim.Mileage === null) {
            	mNewClaim.Mileage = 0;
            }
            this.getModel().callFunction("/CheckWarrantyValidity",{
                method: 'GET',
                urlParameters: {
                    "VIN": sVIN,
                    "ClaimType": sClaimType,
                    "RepairDate": sReferenceDate,
                    "RepairDateStr": this.convertDateToStr(sReferenceDate),
                    "Mileage": mNewClaim.Mileage
                },
                success: $.proxy(function(oData, response) {
                    if(oData.NotValid === 'X'){
                        oThis.bWarrantyValid = false;
                        var sDate = sReferenceDate.toLocaleDateString();
                        var dummyMessage = sDate + " or Mileage.";
                        oThis.popErrorMessage(
                            oThis.getText("wtyValidityErrorTitle"),
                            oThis.getText("wtyWarrantyValidityError",[oData.GaartTxt,dummyMessage])
                        );
                    }else{
                        oThis.bWarrantyValid = true;
                        oThis.resetMessagePopover();
                    }
                    oThis.onStep1FieldChange(oEvent);
                }),
                error: $.proxy(function (oError) {
                    MessageBox.alert(this.gatewayError(oError));
                    oThis.bWarrantyValid = false;
                    oThis.onStep1FieldChange(oEvent);
                }, this)
            });
        },

        refNoValueState: function (clmType, refno) {
            return clmType !== 'ZAUT' && refno === '' ? 'Error' : 'None';
        },
        _readyToCreate: function () {
            var oNewClaim = this.getView().getModel("newClaim").getData().Detail;

            if (this._Customer !== 'Inchcape' &&
                oNewClaim &&
                oNewClaim.Mileage &&
                oNewClaim.Mileage > 0 &&
                oNewClaim.ClaimType !== '' &&
                oNewClaim.PartnerNr !== '' &&
                oNewClaim.Plant !== '' &&
                oNewClaim.ReferenceDate <= new Date().setHours(12) &&
                oNewClaim.ReferenceNr !== '') {
                return true;
            } else {
                return false;
            }
        },
        codesDownloaded: function (oEvent) {
            var test = "stringdsad";
        },


        onStep2FieldChange: function (oEvent) {
            if (this._Customer !== 'Inchcape') return;
            if ($.inArray(oEvent.getSource().getId(), ['symptomCategory', 'troubleCategory']) > -1) {
                this._handleSymTrbCategory(oEvent.getSource());
            } else if (oEvent.getSource().getId() === 'troubleCode') {
                this._handleTrbCode(oEvent.getSource());
            } else if (oEvent.getSource().getId() === 'symptomCode') {
                this._handleSympCode(oEvent.getSource());
            }

            var allOk = true;
            var oData = this.getView().getModel('newClaim').getProperty('/Detail');

            if (oData.PartsInvoiceDate > new Date()) {
                allOk = false;
            }
            if (oData.ClaimSubmissionDate > new Date()) {
                allOk = false;
            }

            if (!sap.ui.getCore().byId('symptomCode').getSelectedKey() || !sap.ui.getCore().byId('troubleCode').getSelectedKey()) {
                allOk = false;
            }

            var oStep2 = this._wizard.getSteps()[1];
            if (allOk) {
                this._wizard.validateStep(oStep2);
                this._oStep2Validated = true;
            } else {
                this._wizard.invalidateStep(oStep2);
                this._oStep2Validated = false;
            }
            this._updateSelectionTexts();

        },
        onStep3FieldChange: function (oEvent) {
            var claimType = this.getView().getModel('newClaim').getProperty('/Detail/ClaimType');
            if (this._Customer !== 'Inchcape') return;
            if (claimType === 'ZZPC') return;

            var allOk = true;
            var oData = this.getView().getModel('newClaim').getProperty('/Detail');

            var oStep3 = this._wizard.getSteps()[2];
            if (allOk) {
                this._wizard.validateStep(oStep3);
                this._oStep3Validated = true;
            } else {
                this._wizard.invalidateStep(oStep3);
                this._oStep3Validated = false;
            }
            this._updateSelectionTexts();

        },
        discardProgress: function (oEvent) {
            var oStep1 = this._findElementIn('claimStep1', this.getView().byId('createClaimPage').findElements(true));
            this._wizard.discardProgress(oStep1);
        },
        createClaim: function (oPayload) {
            var params = {};
            if (this._partsClaim) {
                params.causalPart = this.getView().getBindingContext().getObject().MaterialNr;
            }
            this.busyDialog.open();
            // Send OData Create request
            this.getView().getModel().create("/WtyHeaders", oPayload, {
                success: jQuery.proxy(function (mResponse) {
                	this.busyDialog.close();
                    this.initializeNewClaimData();
                    this._wizard.destroy();
                    this.myRouter.navTo("wtydetail", {
                        wtyPath: "WtyHeaders(guid'" + mResponse.GUID + "')",
                        params: params
                    }, true);
                    this.MessageToast.show(this.getText('wtyClaimCreated', [mResponse.ClaimNr]));
                }, this),
                error: jQuery.proxy(function (oError) {
                    this.busyDialog.close();
                    this.gatewayError(oError);
                }, this)
            });
        },
        onSave: function (oEvent) {
            this.busyDialog.open();
            var mNewClaim = this.getView().getModel("newClaim").getData().Detail;

            var mPayload = {
                ClaimType: mNewClaim.ClaimType,
                PartnerNr: mNewClaim.PartnerNr,
                Plant: mNewClaim.Plant,
                ReferenceDate: mNewClaim.ReferenceDate.setHours(12),
                VIN: this.getView().getBindingContext('vin').getObject().VIN,
                ReferenceNr: mNewClaim.ReferenceNr,
                Mileage: mNewClaim.Mileage,
                MileageUOM: mNewClaim.MileageUOM
            };
            this.createClaim(mPayload);
        },
        onCancel: function (oEvent) {
            // this.onNavBack();
            var sParam = this.VIN,
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
        onNavBack: function () {
            this._wizard.destroy();
            this.resetMessagePopover();
            if (this._partsClaim) {
                this.myRouter.navTo("partsdetail", {
                    materialPath: "Materials('" + this.getView().getBindingContext().getProperty('MaterialNr') + "')"
                }, true);
            } else {
                this.myRouter.navTo("vindetail", {
                    vehiclePath: this.getView().getBindingContext('vin').getProperty("VIN")
                }, true);
            }
        },
        onClaimTypeRefresh: function (oEvent) {
            this.refreshClaimType();
        },
        refreshClaimType: function () {
            var oModel = new sap.ui.model.json.JSONModel();
            var t = this;
            var sVIN = this.VIN;
            var aData = jQuery.ajax({
                type: "GET",
                contentType: "application/json",
                url: "/sap/opu/odata/sap/Y_DP_VEHICLE_SRV/" + this._vehiclePath + "/ClaimTypes",
                dataType: "json",
                success: function (data, textStatus, jqXHR) {
                    var oItems = data.d.results,
                        oItemsToBind = oItems;

                    for (var i = 0; i < oItems.length; i++) {
                        var oItemProperty = oItems[i].ClaimType;
                        if (oItemProperty == "ZZEX") oItemsToBind.splice(i, 1);
                    }

                    oModel.setData(oItemsToBind);

                    var oClaimTypeSelector = sap.ui.getCore().byId("claimType");
                    oClaimTypeSelector.setModel(oModel);
                    oClaimTypeSelector.bindItems({
                        path: "/",
                        template: new Item({
                            key: "{ClaimType}",
                            text: "{ClaimTypeDesc}"
                        })
                    });
                    if (oItemsToBind[0] !== undefined) {
                        t.getPWACategories(sVIN, oItemsToBind[0].ClaimType);
                    }
                },
                error: function (jqxhr, status, exception) {
                    MessageBox.error(t.getText('msgErrorClmty'), {
                        actions: [sap.m.MessageBox.Action.CLOSE]
                    });
                }
            });
        },
        convertDateToStr: function(ref12oclock){
        	 var day = (ref12oclock.getDate().toString().length == 1) ? ("0" + ref12oclock.getDate().toString()) : ref12oclock.getDate().toString();
             var month = ((ref12oclock.getMonth()+1).toString().length == 1) ? ("0" + (ref12oclock.getMonth()+1).toString()) : (ref12oclock.getMonth()+1).toString();
             return ref12oclock.getFullYear().toString() + month + day;
        }
    });
});