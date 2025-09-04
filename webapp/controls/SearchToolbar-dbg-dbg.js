sap.ui.define([
	"sap/m/Toolbar",
	"sap/m/ToolbarRenderer",
	"sap/m/Select",
	"sap/m/Button",
	"sap/m/Title",
	"sap/m/ToolbarSpacer",
	"sap/m/SearchField",
	"sap/ui/core/Item",
	"sap/ui/core/format/DateFormat",
	"sap/m/Dialog",
	"sap/m/DateRangeSelection"
], function(Toolbar, Renderer, Select, Button, Title, ToolbarSpacer, SearchField, Item, DateFormat, Dialog, DateRangeSelection) {

	return Toolbar.extend('encollab.dp.controls.SearchToolbar', {
		metadata: {
			properties: {

			},
			events: {
				search: {},
				filter: {},
			}
		},

		renderer: function(elem, control) {
			Renderer.render(elem, control);
		},

		getFirst: function() {
			return this._first;
		},

		getLast: function() {
			return this._last;
		},

		getDateRange: function() {
			return {
				first: this._first,
				last: this._last
			};
		},

		init: function() {
			Toolbar.prototype.init.apply(this, arguments);

			this._date = new Date();
			this._navigate = 0;
			this._first = null;
			this._last = null;
			this._key = 't';

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

			this.addContent(this._buttonBack);
			this.addContent(this._buttonForward);
			this.addContent(this._textPeriod);
			this.addContent(this._textDates);
			this.addContent(new ToolbarSpacer());
			this.addContent(this._search);
			this.addContent(this._period);

			this._setDates();
		},

		_setDates: function(fireEvent) {
			var f, l, t;

			switch (this._key) {
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

			if (this._key !== 'c') {
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
			if (this._key === 't') {
				this._textDates.setText(this._formatter.format(this._first));
			} else {
				this._textDates.setText(this._formatter.format(this._first) + ' - ' + this._formatter.format(this._last));
			}
			if (fireEvent === true) {
				this.fireSearch({
					first: this._first,
					last: this._last
				});
			}
		},

		_onDialogCancel: function(oEvent) {
			this._dialog.close();
		},

		_onDialogConfirm: function(oEvent) {
			this._first = this._daterange.getDateValue();
			this._last = this._daterange.getSecondDateValue();

			this._dialog.close();
			this._setDates(true);
		},

		_setDateDay: function() {
			var adjust = this._navigate * 7 * -1;

			var f = new Date(this._date - ((this._date.getDay() + adjust) * 1000 * 60 * 60 * 24));
			var l = new Date(f.getTime() + (7 * 1000 * 60 * 60 * 24));

			this._first = new Date(f.getFullYear(), f.getMonth(), f.getDate());
			this._last = new Date(l.getFullYear(), l.getMonth(), l.getDate());
		},

		_setDateMonth: function() {
			this._first = new Date(this._date.getFullYear(), this._date.getMonth() + this._navigate, 1);
			this._last = new Date(this._date.getFullYear(), this._date.getMonth() + this._navigate + 1, 0);
		},

		_setDateQuarter: function() {
			var q = Math.floor((this._date.getMonth() / 3)) + this._navigate;

			this._first = new Date(this._date.getFullYear(), q * 3, 1);
			this._last = new Date(this._date.getFullYear(), (q + 1) * 3, 0);
		},

		_setDateYear: function() {
			this._first = new Date(this._date.getFullYear() + this._navigate, 0, 1);
			this._last = new Date(this._date.getFullYear() + this._navigate + 1, 0, 0);
		},

		_setToday: function() {
			this._first = new Date(this._date.getTime() + this._navigate * 1000 * 60 * 60 * 24);
			this._last = new Date(this._date.getTime() + this._navigate * 1000 * 60 * 60 * 24);
		},

		_onChange: function() {
			this.fireFilter({
				filter: this._search.getValue()
			});
		},

		_onSelect: function(oEvent) {
			this._navigate = 0;
			this._key = this._period.getSelectedKey();
			var enabled = true;

			if (this._key === 'c') {
				this._dialog.open();
				enabled = false;
			} else {
				this._setDates(true);
			}

			this._buttonForward.setEnabled(enabled);
			this._buttonBack.setEnabled(enabled);
		},

		_forward: function() {
			this._navigate++;

			this._setDates(true);
		},

		_backward: function() {
			this._navigate--;

			this._setDates(true);
		},

		onAfterRendering: function() {
			this._setDates(false);
		}
	});
});