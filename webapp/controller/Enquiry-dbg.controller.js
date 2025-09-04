sap.ui.define([
    //"encollab/dp/BaseController",
    "hicron/dp/wty/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/model/json/JSONModel",
    "hicron/dp/wty/model/formatter",
    "sap/ui/export/Spreadsheet"
], function(Controller, Filter, FilterOperator, Sorter, JSONModel, formatter, Spreadsheet) {
    "use strict";
    return Controller.extend("hicron.dp.wty.controller.Enquiry", {
    	formatter: formatter,
        _userAuthorisations: ['WarrantyClaims'],
        _userParameters: [],
        onInit: function() {
            Controller.prototype.onInit.apply(this, arguments);

            this.setModel(new JSONModel({
                facetFilterVis: false
              }), "viewModel");

            this.myRouter.getRoute("wty").attachPatternMatched(this._onWtyMatched, this);
            this.myRouter.getRoute("pwa").attachPatternMatched(this._onPwaMatched, this);
        },
        onAfterViewRendered: function(oEvent) {
            Controller.prototype.onAfterViewRendered.apply(this, arguments);
            window.document.title = 'Claim Search';
        },
       _onWtyMatched: function(oEvent) {
        	var startupParams = this.getOwnerComponent().getComponentData().startupParameters;
			if ((startupParams.createwtypart && startupParams.createwtypart[0])) {
			    //var route = window.location.hash.replace(/(\?)\S+/,"");
			    //window.location.hash = route;
			  this.getRouter().navTo("createwtypart", {
				partPath: startupParams.createwtypart[0]
			}, true);
			} else if ((startupParams.createwty && startupParams.createwty[0])) {
				this.myRouter.navTo("createwty", {
                vehiclePath: startupParams.createwty[0]
            }, true);
			} else if ((startupParams.wtydetail && startupParams.wtydetail[0])) {
				this.myRouter.navTo("wtydetail", {
                wtyPath: "WtyHeaders(guid'" + startupParams.wtydetail[0] + "')"
            }, true);
			} else {
	            // this.myView.setBusy(true);
	            // var sWtyPath = "/" + oEvent.getParameter("arguments").wtyPath;
	            this._pwa = false;
	            //this.myView.getContent()[0].setTitle(this.getText("wtyEnquiryTitle"));
	            this.myView.byId('wtyListToolbarTitle').setText(this.getText("wtyListTitle"));
	            var dates = this.byId('wtySearchBar').getDateRange();
	            this._performSearch(dates.first, dates.last);
			}
        },
        _onPwaMatched: function(oEvent) {
            this._pwa = true;
            this.myView.getContent()[0].setTitle(this.getText("pwaEnquiryTitle"));
            this.myView.byId('wtyListToolbarTitle').setText(this.getText("pwaListTitle"));
            var dates = this.byId('wtySearchBar').getDateRange();
            this._performSearch(dates.first, dates.last);
        },

        onSearchFilter: function(oEvent) {
            var value = oEvent.getParameter('filter');
            this._valueInputSearch = value;
            var dates = this.byId('wtySearchBar').getDateRange();
            this._performSearch(dates.first, dates.last, value);
        },
        
        handleConfirmFilter: function (oEvent) {
            // Get the Facet Filter lists and construct a (nested) filter for the binding
			var oFacetFilter = oEvent.getSource();
			this._filterModel(oFacetFilter);
		},

		_filterModel: function(oFacetFilter) {
			var mFacetFilterLists = oFacetFilter.getLists().filter(function(oList) {
				return oList.getSelectedItems().length;
			});

			if (mFacetFilterLists.length) {
				// Build the nested filter with ORs between the values of each group and
				// ANDs between each group
				var oFilter = new Filter(mFacetFilterLists.map(function(oList) {
					return new Filter(oList.getSelectedItems().map(function(oItem) {
						return new Filter("ProcessingStatus", "EQ", oItem.getKey());
					}), false);
				}), true);
				this._applyFilter(oFilter);
			} else {
				this._applyFilter([]);
			}
		},

        _applyFilter: function(oFilter){
            
            var dates = this.byId('wtySearchBar').getDateRange();
            this._oFilter = oFilter;
            this._performSearch(dates.first, dates.last, this._valueInputSearch);
        },
        
        handleFacetFilterReset: function(oEvent) {
            var oFacetFilter = sap.ui.getCore().byId(oEvent.getParameter("id"));
            //set controll as invisible, due to fact that fireReset not working properly when it is executed externally
            var temp_vis = this.getModel("viewModel").getProperty("/facetFilterVis");
            if(temp_vis){
                this.getModel("viewModel").setProperty("/facetFilterVis",false);
                //oFacetFilter.setProperty("visible",false);
            }
			var aFacetFilterLists = oFacetFilter.getLists();
			for (var i = 0; i < aFacetFilterLists.length; i++) {
				aFacetFilterLists[i].setSelectedKeys();
            }
            this.getModel("viewModel").setProperty("/facetFilterVis",temp_vis);
            // oFacetFilter.setProperty("visible",true)
			this._applyFilter();
		},

        onSearchSearch: function(oEvent) {
            var dates = this.byId('wtySearchBar').getDateRange();
            this.getView().byId("idFacetFilterWty").fireReset();
            this._performSearch(dates.first, dates.last);
        },
        _createRealDate: function(reference){
        	var ref12oclock = reference;
            var day = (ref12oclock.getDate().toString().length == 1) ? ("0" + ref12oclock.getDate().toString()) : ref12oclock.getDate().toString();
            var month = ((ref12oclock.getMonth()+1).toString().length == 1) ? ("0" + (ref12oclock.getMonth()+1).toString()) : (ref12oclock.getMonth()+1).toString();
            var refString = ref12oclock.getFullYear().toString() + month + day;
        	return refString;
        },
		
        _performSearch: function(firstDate, lastDate, searchString) {
            var newFirstDateOld = new Date(firstDate.setHours(12));
            newFirstDateOld.setMinutes(0);
            newFirstDateOld.setSeconds(0);
			
            var newLastDateOld = new Date(lastDate.setHours(12));
            newLastDateOld.setMinutes(0);
            newLastDateOld.setSeconds(0);
            
            //AS string, means no conversion in Timezones
            var newFirstDate = this._createRealDate(firstDate);
            var newLastDate = this._createRealDate(lastDate);

            searchString = searchString || "";

            var oList = this.myView.byId('wtyTable');
            if (!oList) return;
			
            var filters = [
                new Filter('CreatedDte', FilterOperator.BT, newFirstDateOld, newLastDateOld)
            ];
            //Dates as string
            filters.push(
            	new Filter('CreatedDteStr', FilterOperator.BT, newFirstDate, newLastDate) // into one variable. Then moved out from querry in backend code
            	);
            if (this._pwa) {
                filters.push(
                    new Filter("ClaimType", FilterOperator.EQ, 'ZAUT')
                );
                filters.push(
                    new Filter([
                        new Filter("ProcessingStatus", FilterOperator.EQ, 'B001'),
                        new Filter("ProcessingStatus", FilterOperator.EQ, 'B005'),
                        new Filter("ProcessingStatus", FilterOperator.EQ, 'B006'),
                        new Filter("ProcessingStatus", FilterOperator.EQ, 'B061'),
                        new Filter("ProcessingStatus", FilterOperator.EQ, 'ZRTN'),
                        new Filter("ProcessingStatus", FilterOperator.EQ, 'ZRTR')
                    ], false)
                );
            } else {
                // filters.push(
                //     new Filter("ClaimType", FilterOperator.NE, 'ZAUT')
                // );
            }
            if(this._oFilter!==undefined){
                if(this._oFilter.aFilters !== undefined){
                    for(var i = 0; i < this._oFilter.aFilters.length; i++){
                        filters.push(this._oFilter.aFilters[i]);
                    }
                }
            }
            // if (!this._oWtyItemTemplate) {
            //     this._oWtyItemTemplate = sap.ui.xmlfragment("encollab.dp.wty.ClaimTemplate", this);
            // }

            if (searchString.length > 0) {
                // TODO - getthis query option right
                filters.push(
                    new Filter([
                        new Filter("ClaimNr", FilterOperator.Contains, searchString.toUpperCase()),
                        new Filter("WtyHeaderText", FilterOperator.Contains, searchString.toUpperCase()),
                        
                        new Filter([
                        	new Filter("ReferenceNr", FilterOperator.Contains, searchString),
                        	new Filter("ReferenceNr", FilterOperator.Contains, searchString.toUpperCase()),
                        	new Filter("ReferenceNr", FilterOperator.Contains, searchString.toLowerCase()),  
						]),
                        // new Filter("ReferenceNr", FilterOperator.Contains, searchString),
                        new Filter("VIN", FilterOperator.Contains, searchString)
                        // new Filter("ProcessingStatus", FilterOperator.Contains, searchString.substr(0,4))
                    ], false)
                );
            }
 
            var t = this;
            oList.bindRows({
                path: "/WtyHeaders",
                // parameters: {
                //     select: "OrderNr,OrderDate,OrderTypeDesc,SOStatus,SOStatusDesc,ShipAddr_Name1,NetValue,CustomerPONr"
                // },
                // template: this._oWtyItemTemplate,
                // sorter: new Sorter("ChangedDte", true),
                events:{
                    // dataReceived(oData){
                    //     if(!t._filterSelected){
                    //         t._WtyStatusFilter = new JSONModel();
                    //         var filterStatuses = { "filters": []
                    //         };
                    //         for(var i = 0; i < oData.getParameter("data").results.length; i++){
                    //             var filter = {
                    //                 key: oData.getParameter("data").results[i].ProcessingStatus,
                    //                 descr: oData.getParameter("data").results[i].ProcessingStatusText
                    //             }
                    //             filterStatuses.filters.push(filter);
                    //         }
                    //         filterStatuses.filters = t.removeDuplicates(filterStatuses.filters,"key");
                    //         t.getView().setModel(new JSONModel(filterStatuses),"WtyStatus");
                    //     }
                    //     t._filterSelected = false;
                    // }
                },
                sorter: new Sorter("ProcessingStatus", true),
                filters: new Filter({
                    filters: filters,
                    and: true
                })
            });
        },

        onFacetFilterUpdateFinished: function(oEvent){
            if(oEvent.getSource().getItems().length > 0){
                this.getModel("viewModel").setProperty("/facetFilterVis",true);
            }
        },

        /*removeDuplicates: function(myArr, prop) {
            return myArr.filter((obj, pos, arr) => {
                return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
            });
        },*/
        onItemPress: function(oEvent) {
            var oItem = oEvent.getSource().getBindingContext().getObject();
            if (oItem) {
                if (!this._oMaterialPopover) {
                    this._oMaterialPopover = sap.ui.xmlfragment("hicron.dp.wty.view.MaterialPopover", this);
                    this.myView.addDependent(this._oMaterialPopover);
                }
                this._oMaterialPopover.bindElement("/Materials('" + oItem.Material + "')");
                this._oMaterialPopover.openBy(oEvent.getSource());
            }
        },
        onPress: function(oEvent) {
            this.myRouter.navTo("wtydetail", {
                wtyPath: oEvent.getSource().getParent().getBindingContext().getPath().substr(1)
                
            });
        },
        ListRefresh: function(){
           var oModel = this.getView().getModel();
           oModel.refresh(true);
        },
        onExport: function(){
        	var aCols, oRowBinding, oSettings, oSheet, oTable;

			oTable = this.byId("wtyTable");
			oRowBinding = oTable.getBinding();

			aCols = this.createColumnConfig();

			var oModel = oTable.getModel();
			var oModelInterface = oModel.getInterface();

			oSettings = {
				workbook: {
					columns: aCols,
					hierarchyLevel: 'Level'
				},
				dataSource: {
					type: "odata",
					dataUrl: oRowBinding.getDownloadUrl ? oRowBinding.getDownloadUrl() : null,
					serviceUrl: oModelInterface.sServiceUrl,
					headers: oModelInterface.getHeaders ? oModelInterface.getHeaders() : null,
					count: oRowBinding.getLength ? oRowBinding.getLength() : null,
					useBatch: oModelInterface.bUseBatch, // eslint-disable-line
					sizeLimit: oModelInterface.iSizeLimit
				},
				worker: true // We need to disable worker because we are using a MockServer as OData Service
			};

			oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(function() {
				oSheet.destroy();
			});
        },
        createColumnConfig: function() {
			var aCols = [];

			aCols.push({
				label: 'Number of Warranty Claim',
				property: 'ClaimNr',
				type: 'string'
			});
			
			aCols.push({
				label: 'Status',
				property: ['ProcessingStatus', 'ProcessingStatusText'],
				type: 'string',
				template: '{0}-{1}'
			});

			aCols.push({
				label: 'VIN',
				property: 'MaterialAndSerial',
				type: 'string'
			});

			aCols.push({
				label: 'Dealer Number',
				property: 'PartnerName',
				type: 'string'
			});

			aCols.push({
				label: 'Dealer RO Number',
				property: 'ReferenceNr',
				type: 'string'
			});

			aCols.push({
				label: 'Repair Date',
				property: 'ReferenceDate',
				type: 'date'
			});
			
			aCols.push({
				label: 'Amount Claimed',
				property: 'ValueIC',
				type: 'number',
				scale: 2,
				delimiter: true
			});
			
			aCols.push({
				label: 'Amount Approved',
				property: 'ValueOC',
				type: 'number',
				scale: 2,
				delimiter: true
			});

			return aCols;
		},
    });
});