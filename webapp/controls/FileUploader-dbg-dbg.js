sap.ui.define([
	'sap/ui/core/Control'
], function(Control) {

	return Control.extend("encollab.dp.controls.FileUploader", {
		metadata: {
			properties: {
				enabled: {
					type: "boolean",
					defaultValue: true
				},
				csv: {
					type: "boolean",
					defaultValue: true
				},
				allowMultiple: {
					type: "boolean",
					defaultValue: true
				}
			},
			events: {
				data: {},
				error: {}
			}
		},

		attached: false,

		mimes: ['application/vnd.ms-excel', 'text/csv'],

		init: function() {
			this.available = this._detectFileReaderSupport() && this._detectDragAndDropSupport();
		},

		_detectFileReaderSupport: function() {
			return !!FileReader;
		},

		_detectDragAndDropSupport: function() {
			var div = document.createElement('div'); // eslint-disable-line
			return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
		},

		renderer: function(elem, control) {
			elem.write('<div class="fileuploader" ');
			elem.writeControlData(control);
			elem.addStyle("position", "fixed");
			elem.addStyle("top", "0");
			elem.addStyle("left", "0");
			elem.addStyle("width", "100%");
			elem.addStyle("height", "100%");
			elem.addStyle("background", "rgba(255,255,255,0.6)");
			elem.addStyle("visibility", "hidden");
			elem.addStyle("color", "#009de0");
			elem.addStyle("font-size", "15em");
			elem.addStyle("text-align", "center");
			elem.addStyle("line-height", "500px");
			elem.addStyle("font-family", "SAP-icons");
			elem.addStyle("z-index", "99999");
			elem.writeStyles();
			elem.write('>&#57881</div>');
		},

		onAfterRendering: function() {
			var dropZone = $('#' + this.getId());
			var $w = $(window);

			if (dropZone[0]) {
				dropZone = dropZone[0];
			}

			function showDropZone() {
				dropZone.style.visibility = "visible";
			}

			function hideDropZone() {
				dropZone.style.visibility = "hidden";
			}

			function allowDrag(e) {
				if (true) { // eslint-disable-line
					e.dataTransfer.dropEffect = 'copy';
					e.preventDefault();
				}
			}

			function handleDrop(e) {
				e.preventDefault();
				hideDropZone();
				try {
					var files = e.target.files || e.dataTransfer.files;
					if (this.getCsv() === true) {
						// process only the first file for CSV.
						var file = files[0];
						if (this.mimes.indexOf(file.type) >= 0 && file.name.match(/xlsx?$/i) === null) {
							var reader = new FileReader();

							reader.onload = function(e) {
								var data = CSVToArray(reader.result, ',');
								this.fireData({
									data: data,
									name: file.name,
									size: file.size,
									modified: file.lastModified,
									success: true,
									message: (files.length > 1) ? 'Only one file processed' : 'Processing OK'
								});
							}.bind(this);

							reader.readAsText(file);
						} else {
							this.fireError({
								name: file.name,
								type: file.type,
								message: 'File "' + file.name + '" (' + file.type + ') is not a CSV'
							});
						}
					} else {
						this.fireData({
							files: files
						});
					}
				} catch (err) {
					this.fireError({
						message: 'This feature is not supported by your browser'
					});
				}
			}

			if (this.available === true && this.getEnabled() === true) {
				// 1
				$w.on('dragenter', function(e) {
					showDropZone();
				});

				$w.on('drop', function(e) {
					e.preventDefault();
				});

				// 2
				dropZone.addEventListener('dragenter', allowDrag);
				dropZone.addEventListener('dragover', allowDrag);

				// 3
				dropZone.addEventListener('dragleave', function(e) {
					hideDropZone();
				});

				// 4
				dropZone.addEventListener('drop', handleDrop.bind(this));

				hideDropZone();

				this.attached = true;
			}
		}
	});

	function CSVToArray(strData, strDelimiter) {

		strDelimiter = (strDelimiter || ",");

		//csv magic regex.
		var objPattern = new RegExp((
			"(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
			"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
			"([^\"\\" + strDelimiter + "\\r\\n]*))"
		), "gi");
		var arrData = [
			[]
		];

		try {
			var arrMatches = null;
			var strMatchedValue = '';
			
			while ((arrMatches = objPattern.exec(strData))) {
				var strMatchedDelimiter = arrMatches[1];
				if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
					arrData.push([]);
				}
				if (arrMatches[2]) {
					strMatchedValue = arrMatches[2].replace(new RegExp("\"\"", "g"), "\"");
				} else {
					strMatchedValue = arrMatches[3];
				}
				arrData[arrData.length - 1].push(strMatchedValue);
			}
		} catch (e) {
			console.log('Errors parsing CSV. Is this a CSV?'); // eslint-disable-line
		}
		return arrData;
	}
});
