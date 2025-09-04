sap.ui.define([
    "encollab/dp/controls/SearchToolbar",
    "sap/m/ToolbarRenderer",
    "sap/m/Select",
    "sap/m/Button",
    "sap/m/Title",
    "sap/m/ToolbarSpacer",
    "sap/m/SearchField",
    "sap/ui/core/Item",
    "sap/ui/core/format/DateFormat",
    "sap/m/Dialog",
    "sap/m/DateRangeSelection",
    "sap/m/CheckBox"
], function(Toolbar, Renderer, Select, Button, Title, ToolbarSpacer, SearchField, Item, DateFormat, Dialog, DateRangeSelection, CheckBox) {

    return Toolbar.extend('encollab.dp.controls.SearchToolbar2', {
        metadata: {
            properties: {

            }
            // events: {
            // 	search: {},
            // 	filter: {},
            // }
        },

        renderer: function(elem, control) {
            Renderer.render(elem, control);
        },

        getDateRange: function() {
            return {
                first: this._key !== 'a' ? this._first : null,
                last: this._key !== 'a' ? this._last : null
            };
        },

        getOnlyOpenOrders: function() {
            return this._checkbox.getSelected();
        },

        init: function() {

            this._date = new Date();
            this._navigate = 0;
            this._first = null;
            this._last = null;
            this._key = 'a';

            this._formatter = DateFormat.getDateTimeInstance({
                pattern: "dd MMM yyyy" //"dd-MM-yyyy"
            });

            this._daterange = new DateRangeSelection({
                maxDate: new Date()
            });
            this._dialog = new Dialog({
                title: 'Pick a date range',
                content: [this._daterange],
                buttons: [
                    new Button({
                        text: 'Cancel',
                        press: this._onDialogCancel.bind(this)
                    }),
                    new Button({
                        text: 'Confirm',
                        press: this._onDialogConfirm.bind(this)
                    })
                ]
            });

            this._buttonForward = new Button({
                icon: "sap-icon://navigation-right-arrow",
                press: this._forward.bind(this)
            });

            this._buttonBack = new Button({
                icon: "sap-icon://navigation-left-arrow",
                press: this._backward.bind(this)
            });

            this._textPeriod = new Title({
                text: 'This week'
            });

            this._textDates = new Title({
                text: 'NULL'
            });

            this._search = new SearchField({
                width: '30%',
                search: this._onChange.bind(this)
            });

            this._period = new Select({
                change: this._onSelect.bind(this),
                items: [
                    new Item({
                        key: 'a',
                        text: 'All Dates'
                    }),
                    new Item({
                        key: 't',
                        text: 'Day'
                    }),
                    new Item({
                        key: 'w',
                        text: 'Week'
                    }),
                    new Item({
                        key: 'm',
                        text: 'Month'
                    }),
                    new Item({
                        key: 'q',
                        text: 'Quarter'
                    }),
                    new Item({
                        key: 'y',
                        text: 'Year'
                    }),
                    new Item({
                        key: 'c',
                        text: 'Custom'
                    })
                ]
            });

            this._checkbox = new CheckBox({
                text: 'Only Open Orders',
                selected: true,
                select: this._onCheckBoxSelect.bind(this)
            });

            this.addContent(this._buttonBack);
            this.addContent(this._buttonForward);
            this.addContent(this._textPeriod);
            this.addContent(this._textDates);
            this.addContent(new ToolbarSpacer());
            this.addContent(this._checkbox);
            this.addContent(this._search);
            this.addContent(this._period);

            this._setDates();
        },

        _setDates: function(fireEvent) {
            var f, l, t;

            switch (this._key) {
                case "a":
                    this._setToday();
                    t = 'All Orders';
                    break;
                case "t":
                    this._setToday();
                    t = 'Day';
                    break;
                case "w":
                    this._setDateDay();
                    t = 'Week';
                    break;
                case "m":
                    this._setDateMonth();
                    t = 'Month';
                    break;
                case "q":
                    this._setDateQuarter();
                    t = 'Quarter';
                    break;
                case "y":
                    this._setDateYear();
                    t = 'Year';
                    break;
                case "c":
                    t = 'Range';
                    this._dialog.open();
                    break;
            }

            if (this._key !== 'a' && this._key !== 'c') {
                switch (this._navigate) {
                    case -1:
                        t = (this._key === 't') ? 'Yesterday' : 'Last ' + t.toLowerCase();
                        break;
                    case 0:
                        t = (this._key === 't') ? 'Today' : 'This ' + t.toLowerCase();
                        break;
                    case 1:
                        t = (this._key === 't') ? 'Tomorrow' : 'Next ' + t.toLowerCase();
                        break;
                }
            }


            this._textPeriod.setText(t + ': ');
            switch (this._key) {
                case 'a':
                    this._textDates.setText('');
                    break;
                case 't':
                    this._textDates.setText(this._formatter.format(this._first));
                    break;
                default:
                    this._textDates.setText(this._formatter.format(this._first) + ' - ' + this._formatter.format(this._last));
                    break;
            }
            if (fireEvent === true) {
                this.fireSearch({
                    first: this._first,
                    last: this._last
                });
            }
        },

        _onCheckBoxSelect: function(oEvent) {
        	this._setDates(true);
        },

        onAfterRendering: function() {
            this._setDates(false);
        }
    });
});