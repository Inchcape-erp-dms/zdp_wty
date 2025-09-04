sap.ui.define([
    "encollab/dp/BaseController",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function(Controller, ODataModel, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("hicron.dp.wty.controller.BaseController", {
        symptTroublCodes: { 'symptomCategory': {target: 'symptomCode',
                                         path: 'SymptomCategory'},
                            'troubleCategory': {target:'troubleCode',
                                                path: 'TroubleCategory'},
                            'symptomCode': {target:'symptomCategory',
                                            path:'SymptomCode'},
                            'troubleCode': {target:'troubleCategory',
                                            path:'TroubleCode'},
                            'idSymptomCategory': {target: 'idSymptomCode',
                                        path: 'SymptomCategory'},
                            'idTroubleCategory': {target:'idTroubleCode',
                                                path: 'TroubleCategory'},
                            'idSymptomCode': {target:'idSymptomCategory',
                                            path:'SymptomCode'},
                            'idTroubleCode': {target:'idTroubleCategory',
                                            path:'TroubleCode'}
                            },
        onInit: function() {
            Controller.prototype.onInit.apply(this, arguments);

            // var oModel = new ODataModel({
            //     serviceUrl: "/sap/opu/odata/sap/Y_DP_VEHICLE_SRV/",
            //     defaultCountMode: "Inline"
            // });

            // this.getView().setModel(oModel,'vin');
        },
        _handleSymTrbCategory: function(oSelect, bDontClear){
            
            var sTargetId = this.symptTroublCodes[oSelect.getId()].target;// == 'symptomCategory' ? 'symptomCode' : 'troubleCode';
            var sPath = this.symptTroublCodes[oSelect.getId()].path; //oSelect.getId() == 'symptomCategory' ? 'SymptomCategory' : 'TroubleCategory';
            //{path: 'WtyTroubleCodes>/results', filters: [{path:'TroubleCategory',operator:'NE',value1:''}]}
            var oTargetBinding = sap.ui.getCore().byId(sTargetId).getBinding('items');
            var mCurrentTargetKey = sap.ui.getCore().byId(sTargetId).getSelectedKey();
            if(!bDontClear){
                sap.ui.getCore().byId(sTargetId).setSelectedKey(null);
            }
            oTargetBinding.filter([new Filter(sPath, sap.ui.model.FilterOperator.Contains, oSelect.getSelectedKey())]);
        },

        _handleTrbCode: function(oSelect){
            var sTargetId = this.symptTroublCodes[oSelect.getId()].target;
            var oTarget = sap.ui.getCore().byId(sTargetId);
            var oSourceBinding = sap.ui.getCore().byId(oSelect.getId()).getBinding('items');
            for(var i = 0; i < oSourceBinding.oList.length; i++){
                if(oSourceBinding.oList[i].TroubleCode === oSelect.getSelectedKey()){
                    oTarget.setSelectedKey(oSourceBinding.oList[i].TroubleCategory);
                    break;
                }
            }
            this._handleSymTrbCategory(sap.ui.getCore().byId(sTargetId), true);
        },

        _handleSympCode: function(oSelect){ 
            var sTargetId = this.symptTroublCodes[oSelect.getId()].target;
            var oTarget = sap.ui.getCore().byId(sTargetId);
            var oSourceBinding = sap.ui.getCore().byId(oSelect.getId()).getBinding('items');
            for(var i = 0; i < oSourceBinding.oList.length; i++){
                if(oSourceBinding.oList[i].SymptomCode === oSelect.getSelectedKey()){
                    oTarget.setSelectedKey(oSourceBinding.oList[i].SymptomCategory);
                    break;
                }
            }
            this._handleSymTrbCategory(sap.ui.getCore().byId(sTargetId), true);
        },
    });

});