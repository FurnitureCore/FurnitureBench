(function() {

let item_parents = [
	'item/generated', 	'minecraft:item/generated',
	'item/handheld', 	'minecraft:item/handheld',
	'item/handheld_rod','minecraft:item/handheld_rod',
	'builtin/generated','minecraft:builtin/generated',
]


/**
 * Exports the model file based on the provided options.
 *
 * @param {Object} options - The options for exporting the model file.
 * @param {boolean} [options.cube_name] - Whether to include cube names in the export.
 * @param {boolean} [options.prevent_dialog] - Whether to prevent dialog boxes from appearing.
 * @param {boolean} [options.comment] - Whether to include comments in the export.
 * @param {boolean} [options.parent] - Whether to include the parent property in the export.
 * @param {boolean} [options.ambientocclusion] - Whether to include the ambient occlusion property in the export.
 * @param {boolean} [options.textures] - Whether to include textures in the export.
 * @param {boolean} [options.elements] - Whether to include elements in the export.
 * @param {boolean} [options.front_gui_light] - Whether to include front GUI light in the export.
 * @param {boolean} [options.overrides] - Whether to include overrides in the export.
 * @param {boolean} [options.display] - Whether to include display settings in the export.
 * @param {boolean} [options.groups] - Whether to include groups in the export.
 * @returns {Object} The exported model JSON object.
 */
function exportModelFile (options) {
	var clear_elements = []
	var textures_used = []
	var element_index_lut = []
	var overflow_cubes = [];

	function computeCube(s) {
		if (s.export == false) return;
		//Create Element
		var element = {}
		element_index_lut[Cube.all.indexOf(s)] = clear_elements.length

		if ((options.cube_name !== false && !settings.minifiedout.value) || options.cube_name === true) {
			if (s.name !== 'cube') {
				element.name = s.name
			}
		}
		element.from = s.from.slice();
		element.to = s.to.slice();
		if (s.inflate) {
			for (var i = 0; i < 3; i++) {
				element.from[i] -= s.inflate;
				element.to[i] += s.inflate;
			}
		}
		if (s.shade === false) {
			element.shade = false
		}
		if (s.light_emission) {
			element.light_emission = s.light_emission;
		}
		if (!s.rotation.allEqual(0) || (!s.origin.allEqual(0) && settings.java_export_pivots.value)) {
			var axis = s.rotationAxis()||'y';
			element.rotation = new oneLiner({
				angle: s.rotation[getAxisNumber(axis)],
				axis,
				origin: s.origin
			})
		}
		if (s.rescale) {
			if (element.rotation) {
				element.rotation.rescale = true
			} else {
				element.rotation = new oneLiner({
					angle: 0,
					axis: s.rotation_axis||'y',
					origin: s.origin,
					rescale: true
				})
			}

		}
		if (s.rotation.positiveItems() >= 2) {
			element.rotated = s.rotation
		}
		var element_has_texture
		var e_faces = {}
		for (var face in s.faces) {
			if (s.faces.hasOwnProperty(face)) {
				if (s.faces[face].texture !== null) {
					var tag = new oneLiner()
					if (s.faces[face].enabled !== false) {
						tag.uv = s.faces[face].uv.slice();
						tag.uv.forEach((n, i) => {
							tag.uv[i] = n * 16 / UVEditor.getResolution(i%2);
						})
					}
					if (s.faces[face].rotation) {
						tag.rotation = s.faces[face].rotation
					}
					if (s.faces[face].texture) {
						var tex = s.faces[face].getTexture()
						if (tex) {
							tag.texture = '#' + tex.id
							textures_used.safePush(tex)
						}
						element_has_texture = true
					}
					if (!tag.texture) {
						tag.texture = '#missing'
					}
					if (s.faces[face].cullface) {
						tag.cullface = s.faces[face].cullface
					}
					if (s.faces[face].tint >= 0) {
						tag.tintindex = s.faces[face].tint
					}
					e_faces[face] = tag
				}
			}
		}
		//Gather Textures
		if (!element_has_texture) {
			element.color = s.color
		}
		element.faces = e_faces

		if (Format.cube_size_limiter) {
			function inVd(n) {
				return n < -16 || n > 32; 
			}
			if (inVd(element.from[0]) ||
				inVd(element.from[1]) ||
				inVd(element.from[2]) ||
				inVd(element.to[0]) ||
				inVd(element.to[1]) ||
				inVd(element.to[2])
			) {
				overflow_cubes.push(s);
			}
		}
		if (Object.keys(element.faces).length) {
			clear_elements.push(element)
		}
	}
	function iterate(arr) {
		var i = 0;
		if (!arr || !arr.length) {
			return;
		}
		for (i=0; i<arr.length; i++) {
			if (arr[i].type === 'cube') {
				computeCube(arr[i])
			} else if (arr[i].type === 'group') {
				iterate(arr[i].children)
			}
		}
	}
	iterate(Outliner.root)

	function checkExport(key, condition) {
		key = options[key]
		if (key === undefined) {
			return condition;
		} else {
			return key
		}
	}
	var isTexturesOnlyModel = clear_elements.length === 0 && checkExport('parent', Project.parent != '')
	var texturesObj = {}
	Texture.all.forEach(function(t, i){
		var link = t.javaTextureLink()
		link = link.replace(/^[^:]*:/, ''); // remove namespace
		if (t.particle) {
			texturesObj.particle = link
		}
		if (!textures_used.includes(t) && !isTexturesOnlyModel) return;
		if (t.id !== link.replace(/^#/, '')) {
			texturesObj[t.id] = link
		}
	})

	if (options.prevent_dialog !== true && overflow_cubes.length > 0 && settings.dialog_larger_cubes.value) {
		Blockbench.showMessageBox({
			translateKey: 'model_clipping',
			icon: 'settings_overscan',
			message: tl('message.model_clipping.message', [overflow_cubes.length]),
			buttons: ['dialog.scale.select_overflow', 'dialog.ok'],
			confirm: 1,
			cancel: 1,
		}, (result) => {
			if (result == 0) {
				selected.splice(0, Infinity, ...overflow_cubes)
				updateSelection();
			}
		})
	}
	if (options.prevent_dialog !== true && clear_elements.length && item_parents.includes(Project.parent)) {
		Blockbench.showMessageBox({
			translateKey: 'invalid_builtin_parent',
			icon: 'info',
			message: tl('message.invalid_builtin_parent.message', [Project.parent])
		})
		Project.parent = '';
	}

	// model.json
	var modelJson = {}
	if (checkExport('comment', Project.credit || settings.credit.value)) {
		modelJson.credit = Project.credit || settings.credit.value
	}
	if (checkExport('parent', Project.parent != '')) {
		modelJson.parent = Project.parent
	}
	if (checkExport('ambientocclusion', Project.ambientocclusion === false)) {
		modelJson.ambientocclusion = false
	}
	if (Project.unhandled_root_fields.render_type) {
		modelJson.render_type = Project.unhandled_root_fields.render_type;
	}
	if (Project.texture_width !== 16 || Project.texture_height !== 16) {
		modelJson.texture_size = [Project.texture_width, Project.texture_height]
	}
	if (checkExport('textures', Object.keys(texturesObj).length >= 1)) {
		modelJson.textures = texturesObj
	}
	if (checkExport('elements', clear_elements.length >= 1)) {
		modelJson.elements = clear_elements
	}
	if (checkExport('front_gui_light', Project.front_gui_light)) {
		modelJson.gui_light = 'front';
	}
	if (checkExport('overrides', Project.overrides instanceof Array && Project.overrides.length)) {
		Project.overrides.forEach(override => delete override._uuid)
		modelJson.overrides = Project.overrides.map(override => new oneLiner(override));
	}
	if (checkExport('display', Object.keys(Project.display_settings).length >= 1)) {
		var new_display = {}
		var entries = 0;
		for (var i in DisplayMode.slots) {
			var key = DisplayMode.slots[i]
			if (DisplayMode.slots.hasOwnProperty(i) && Project.display_settings[key] && Project.display_settings[key].export) {
				new_display[key] = Project.display_settings[key].export()
				entries++;
			}
		}
		if (entries) {
			modelJson.display = new_display
		}
	}
	if (checkExport('groups', (settings.export_groups.value && Group.all.length))) {
		groups = compileGroups(false, element_index_lut)
		var i = 0;
		while (i < groups.length) {
			if (typeof groups[i] === 'object') {
				i = Infinity
			}
			i++
		}
		if (i === Infinity) {
			modelJson.groups = groups
		}
	}
	for (let key in Project.unhandled_root_fields) {
		if (modelJson[key] === undefined) modelJson[key] = Project.unhandled_root_fields[key];
	}
	return modelJson
}

/**
 * Exports the properties of a project to a properties file.
 *
 * @param {Object} options - The options for exporting the properties file.
 * @returns {Object} The properties of the project.
 */
function exportPropertiesFile (options) {
	// todo: parse properties
	console.log('exportPropertiesFile')
	let properties = {
		"display_name": Project.display_name,
		"can_rotate": Project.can_rotate,
		"can_hanging": Project.can_hanging,
		"function": Project.functionality instanceof Functionality ? 
						Project.functionality.json() : Functionalities.none,
	}
	return properties
}

/**
 * Imports properties from a given object and assigns them to the Project.
 *
 * @param {Object} properties - The properties object to import.
 * @param {string} [properties.display_name] - The display name of the project.
 * @param {boolean} [properties.can_rotate] - Indicates if the project can rotate.
 * @param {boolean} [properties.can_hanging] - Indicates if the project can hang.
 * @param {Object} [properties.function] - The functionality object of the project.
 * @param {string} [properties.function.type] - The type of functionality.
 */
function importPropertiesFile (properties) {
	console.log(properties)
	Project.display_name = properties.display_name || Project.display_name
	Project.can_rotate = properties.can_rotate || Project.can_rotate
	Project.can_hanging = properties.can_hanging || Project.can_hanging

	functionality = properties.function || Functionalities.none.json()
	for (let key in Functionalities) {
        if (functionality.type === key) {
            Project.functionality = Functionalities[key];
			Project.functionality.load(functionality);
			break;
        }
    }

}

var codec = new Codec('furniture_core', {
	name: 'Furniture Core Model',
	remember: true,
	extension: 'zip',
	load_filter: {
		type: 'zip',
		extensions: ['zip']
	},
	/**
	 * Asynchronously compiles the model and properties into a zip file.
	 *
	 * @param {Object} [options] - Optional parameters for the compilation process.
	 * @returns {Promise<Blob>} A promise that resolves to a Blob representing the generated zip file.
	 */
	async compile(options) {	// generate zip file
		if (options === undefined) options = {}
		var modelJson = exportModelFile(options)
		var propertiesJson = exportPropertiesFile(options)
		this.dispatchEvent('compile', {model: modelJson, options});

		var zip = new JSZip()
		zip.file('model.json', autoStringify(modelJson))
		zip.file('properties.json', autoStringify(propertiesJson))
		Texture.all.forEach(function(t, i){
			var file = t.javaTextureLink()
			file = file.replace(/^[^:]*:/, ''); // remove namespace
			file = file + '.png'
			zip.file(file, t.getBase64(), {base64: true})
		})
		return await zip.generateAsync({type:"blob"})
	},
	/**
	 * Asynchronously exports the current model with the specified options.
	 * 
	 * @async
	 * @function export
	 * @returns {Promise<void>} A promise that resolves when the export is complete.
	 * 
	 * @description
	 * This function handles the export process for the current model. It first checks if there are any export options
	 * specified. If there are, it prompts the user to confirm these options. If the user cancels the prompt, the function
	 * returns early. Otherwise, it compiles the model content and initiates the export process using Blockbench's export
	 * functionality. The export process includes specifying the resource ID, type, file extension, file name, start path,
	 * and content. If the application is running in a specific environment (indicated by `isApp`), a custom writer function
	 * is used to handle the file writing process. After the download is complete, the `afterDownload` callback is executed
	 * with the path of the downloaded file.
	 */
	async export() {
		if (Object.keys(this.export_options).length) {
			let result = await this.promptExportOptions();
			if (result === null) return;
		}
		let content = await this.compile({});
		Blockbench.export({
			resource_id: 'model',
			type: this.name,
			extensions: [this.extension],
			name: this.fileName(),
			startpath: this.startPath(),
			content: content,
			custom_writer: isApp ? (a, b) => this.write(a, b) : null,
		}, path => this.afterDownload(path))
	},
	/**
	 * Parses a ZIP file containing a Minecraft model and its properties, and imports the model into Blockbench.
	 * 
	 * @param {File} zipFileContent - The ZIP file containing the model and properties.
	 * @param {string} path - The file path of the ZIP file.
	 * @param {boolean} add - Whether to add the model to the existing project or replace it.
	 * @returns {Promise<void>} - A promise that resolves when the parsing and importing is complete.
	 * @fires parse - Dispatched when the model is parsed.
	 * @fires parsed - Dispatched when the model is fully parsed and imported.
	 */
	async parse(zipFileContent, path, add) {		
		try {
			var zip = new JSZip()
			await zip.loadAsync(zipFileContent)
		} catch (err) {
			console.error(err)
			Blockbench.showMessageBox({
				title: tl('action.import_furniture_core_model.error'),
				icon: 'error',
				message: err.message
			})
			return;
		}
		

		if (!zip.file('model.json')) {
			Blockbench.showMessageBox({
				title: 'action.import_furniture_core_model.error',
				icon: 'error',
				message: 'Missing model.json file.'
			})
			return;
		}

		// load name
		Project.name = pathToName(path, false)

		// load model and properties
		var model = autoParseJSON(await zip.file('model.json').async('string'))
		var properties = autoParseJSON(await zip.file('properties.json').async('string') || '{}')
		console.log(model, properties)

		this.dispatchEvent('parse', {model});

		// Parse Properties
		importPropertiesFile(properties)

		// Parse Model
		var previous_texture_length = add ? Texture.all.length : 0
		var new_cubes = [];
		var new_textures = [];
		if (add) {
			Undo.initEdit({elements: new_cubes, outliner: true, textures: new_textures})
			Project.added_models++;
			var import_group = new Group(pathToName(path, false)).init()
		}

		//Load
		if (typeof (model.credit || model.__comment) == 'string') Project.credit = (model.credit || model.__comment);
		if (model.texture_size instanceof Array && !add) {
			Project.texture_width  = Math.clamp(parseInt(model.texture_size[0]), 1, Infinity)
			Project.texture_height = Math.clamp(parseInt(model.texture_size[1]), 1, Infinity)
		}
		if (model.display !== undefined) {
			DisplayMode.loadJSON(model.display)
		}
		if (model.overrides instanceof Array) {
			Project.overrides = model.overrides.slice();
		}

		var texture_ids = {}
		var texture_paths = {}
		if (model.textures) {
			//Create Path Array to fetch textures
			var path_arr = path.split(osfs)
			if (!path_arr.includes('cit')) {
				var index = path_arr.length - path_arr.indexOf('models')
				path_arr.splice(-index)
			}

			var texture_arr = model.textures

			for (var key in texture_arr) {
				if (typeof texture_arr[key] === 'string' && key != 'particle') {
					let link = texture_arr[key];
					if (link.startsWith('#') && texture_arr[link.substring(1)]) {
						link = texture_arr[link.substring(1)];
					}
					let img = await zip.file(link + '.png').async('base64')
					let texture = new Texture({id: key}).fromImageBase64(link, img).add();
					texture_paths[texture_arr[key].replace(/^minecraft:/, '')] = texture_ids[key] = texture;
					new_textures.push(texture);
				}
			}
			if (texture_arr.particle) {
				let link = texture_arr.particle;
				if (link.startsWith('#') && texture_arr[link.substring(1)]) {
					link = texture_arr[link.substring(1)];
				}
				if (texture_paths[link.replace(/^minecraft:/, '')]) {
					texture_paths[link.replace(/^minecraft:/, '')].enableParticle()
				} else {
					let img = await zip.file(link + '.png').async('base64')
					let texture = new Texture({id: 'particle'}).fromImageBase64(link, img).enableParticle().add();
					texture_paths[link.replace(/^minecraft:/, '')] = texture_ids.particle = texture;
					new_textures.push(texture);
				}
			}
			//Get Rid Of ID overlapping
			for (var i = previous_texture_length; i < Texture.all.length; i++) {
				var t = Texture.all[i]
				if (getTexturesById(t.id).length > 1) {
					t.id = Project.added_models + '_' + t.id
				}
			}
			//Select Last Texture
			if (Texture.all.length > 0) {
				Texture.all.last().select();
			}
		}

		var oid = elements.length

		if (model.elements) {
			model.elements.forEach(function(obj) {
				base_cube = new Cube(obj)
				if (obj.__comment) base_cube.name = obj.__comment
				//Faces
				var faces_without_uv = false;
				for (var key in base_cube.faces) {
					if (obj.faces[key] && !obj.faces[key].uv) {
						faces_without_uv = true;
					}
				}
				if (faces_without_uv) {
					base_cube.autouv = 2
					base_cube.mapAutoUV()
				} else {
					base_cube.autouv = 0;
				}

				for (var key in base_cube.faces) {
					var read_face = obj.faces[key];
					var new_face = base_cube.faces[key];
					if (read_face === undefined) {

						new_face.texture = null
						new_face.uv = [0,0,0,0]
					} else {
						if (typeof read_face.uv === 'object') {

							new_face.uv.forEach((n, i) => {
								new_face.uv[i] = read_face.uv[i] * UVEditor.getResolution(i%2) / 16;
							})
						}
						if (read_face.texture === '#missing') {
							new_face.texture = false;
							
						} else if (read_face.texture) {
							var id = read_face.texture.replace(/^#/, '')
							var t = texture_ids[id]

							if (t instanceof Texture === false) {
								if (texture_paths[read_face.texture]) {
									var t = texture_paths[read_face.texture]
									if (t.id === 'particle') {
										t.extend({id: id, name: '#'+id}).loadEmpty(3)
									}
								} else {
									var t = new Texture({id: id, name: '#'+id}).add(false).loadEmpty(3)
									texture_ids[id] = t
									new_textures.push(t);
								}
							}
							new_face.texture = t.uuid;
						}
						if (typeof read_face.tintindex == 'number') {
							new_face.tint = read_face.tintindex;
						}
					}
				}

				if (!add) {
					Outliner.root.push(base_cube)
					base_cube.parent = 'root'
				} else if (import_group) {
					import_group.children.push(base_cube)
					base_cube.parent = import_group
				}
				base_cube.init()
				new_cubes.push(base_cube);
			})
		}
		if (model.groups && model.groups.length > 0) {
			if (!add) {
				parseGroups(model.groups)
			} else if (import_group) {
				parseGroups(model.groups, import_group, oid)
			}
		}
		if (import_group) {
			import_group.addTo().select()
		}
		if (
			!model.elements &&
			item_parents.includes(model.parent) &&
			model.textures &&
			typeof model.textures.layer0 === 'string'
		) {
			let texture_mesh = new TextureMesh({
				name: model.textures.layer0,
				rotation: [90, 180, 0],
				local_pivot: [0, -7.5, -16],
				locked: true,
				export: false
			}).init()
			texture_mesh.locked = true;

			new_cubes.push(texture_mesh);

		} else if (!model.elements && model.parent) {
			let can_open = isApp && !model.parent.replace(/\w+:/, '').startsWith('builtin');
			Blockbench.showMessageBox({
				translateKey: 'child_model_only',
				icon: 'info',
				message: tl('message.child_model_only.message', [model.parent]),
				commands: can_open && {
					open: 'message.child_model_only.open',
					open_with_textures: {text: 'message.child_model_only.open_with_textures', condition: Texture.all.length > 0}
				}
			}, (result) => {
				if (result) {
					let parent = model.parent.replace(/\w+:/, '');
					let path_arr = path.split(osfs);
					let index = path_arr.length - path_arr.indexOf('models');
					path_arr.splice(-index);
					path_arr.push('models', ...parent.split('/'));
					let parent_path = path_arr.join(osfs) + '.json';

					Blockbench.read([parent_path], {}, (files) => {
						loadModelFile(files[0]);

						if (result == 'open_with_textures') {
							Texture.all.forEachReverse(tex => {
								if (tex.error == 3 && tex.name.startsWith('#')) {
									let loaded_tex = texture_ids[tex.name.replace(/#/, '')];
									if (loaded_tex) {
										tex.fromPath(loaded_tex.path);
										tex.namespace = loaded_tex.namespace;
									}
								}
							})
						}
					})
				}
			})
		}
		updateSelection()

		//Set Parent
		if (model.parent !== undefined) {
			Project.parent = model.parent;
		}
		//Set Ambient Occlusion
		if (model.ambientocclusion === false) {
			Project.ambientocclusion = false;
		}
		if (model.gui_light === 'front') {
			Project.front_gui_light = true;
		}
		let supported_fields = new Set(['textures', 'elements', 'groups', 'parent', 'display', '__comment', 'credit', 'texture_size', 'overrides', 'ambientocclusion', 'gui_light']);
		for (let key in model) {
			if (!supported_fields.has(key)) {
				Project.unhandled_root_fields[key] = model[key];
			}
		}

		this.dispatchEvent('parsed', {model});
		if (add) {
			Undo.finishEdit('Add block model')
		}
		Validator.validate()
	},
	/**
	 * Asynchronously loads a model from a file and optionally adds it to the project.
	 *
	 * @param {Object} zipFileContent - The model object to load data into.
	 * @param {Object} file - The file object containing the path and other file-related information.
	 * @param {boolean} add - A flag indicating whether to add the model to the project.
	 * @returns {Promise<boolean>} - Returns a promise that resolves to false if parsing is not available.
	 */
	async load(zipFileContent, file, add) {
		if (!this.parse) return false;
		if (!add) {
			setupProject(this.format)
		}
		if (file.path && isApp && this.remember && !file.no_file ) {
			var name = pathToName(file.path, true);
			Project.name = pathToName(name, false);
			Project.export_path = file.path;
		}

		this.parse(zipFileContent, file.path, false)

		if (file.path && isApp && this.remember && !file.no_file ) {
			loadDataFromModelMemory();
			addRecentProject({
				name,
				path: file.path,
				icon: Format.icon
			})
			let project = Project;
			setTimeout(() => {
				if (Project == project) updateRecentProjectThumbnail();
			}, 500)
		}
		Settings.updateSettingsInProfiles();
	},
})

var format = new ModelFormat({
	id: 'furniture_core',
	extension: 'json',
	icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAI5UlEQVR4Ae2bb0wb5x3HyVJpUxftZau10t5E6ptKnSZVmhZVTV/1RV9EkZaoSwhtaLOlyUJIw5/DEKhzkAZIiH2GqUqzNWnSNCqZln/gJNA224INdo2xfZDYhgB3DoEY2wwSWIK557s+NucYx2ADxrYyI3313D3P3XO/7+d+d89z3Dkra/ZPqVT+RM2qd3MsN8yxHObTIeYQSvMUUOQpwBYqMGRkAJEBBAYYLAH5u5YQTQ9IPZ8YVRhB9utAPm4H4c4Alm2ANRuwZWPou1ywBUwgFhoTjW2+uGfrh6lH6lX2HSrrq+pf51huJEYHgYMsDKAZaQyAAhqhXkPG5QWO5XbEMk/bY2dA2gOgEHbIvkOlplKzKwLADMdyDyJ1iDn0sDRPMUlVWaiYuvcDI829BJII4PtcqbKAmZLjobFFxju7Tr2ELg/qNWRcXogCoEPDatarWNXvuCpunaxqpuqN8jzF+rL8sjc1ypK3p5yMJXD9h+4BSQJgzcaUKceiURa9TWOhMdHY5DhpSWOnHjiW61g0AA2rudbY2LhaBjRfCRdTDIGRntwEVxCAJuwmaM2WYN1WNF9ccj31QL0sGgDHctc1Gs1P5Y7mK+FWroHA5EFgLmNA0ULOfTtMNN2JGQHoSCKPAvv1IEfOu9GV0wrrtsuwZOehZ/Oa+eKS66kH6mXFAMgHApTPwXT8efIX24WEDYHhAAp0IEVtzWhUrsGNt56TjxurTBoAGgiysEpq4L9KKIByQ3AeQAEU6huhxNNj+AIUkgogAKGhe1/CAKhtICXtINR8gQ4o1Me85iNZJB/AZ5aXSQOvSwiESlPIPCnQGcDc/FWkwVjrSQcQzIKeV0mD7TzR8KNSve2xv96KuKSxYlpjwfSxLkyzRkhFumlSoPORIt0FFHa8FststPaUAAhAODnwMzT0vGo60lR+4fCZmX8cPoNYOl91CidLNPjbfhW+yD8m3dh3ugqM4ddQmp6PZi6eupQBkIOrU9ZtULFqv4pVYyGpWTWOVBxF6V4FSvJKqGaK8kt+L/ez1DLlAFSVqo0cy82ZioaPyeHLdRV1OJBfFnjaLM1TSGX5ZZuXalzeL+UA1Er1axzLDYQbnW+5prQaZXtLZQBieV75b2QjSy1TDgDAKjWr/i3Hcn9SH1T/sfF04wXtRS2aLzQ/pVPHT10q2VPy0YE8xa6yvWXroj63L5JEygFExsvzfE5XVxfp6upChAhti9x+uetpB8BsNq83m82TZrMZEaJ165drOHL/tAPA8/xanuddPM8jQrRubaSB5a6nHYDe3t5fDA4OdgiCgHDROtq2XMOR+6cdAACrRVH8RhRFROgb2hZpYLnraQeAGhJF8dMI8xTGp8s1G23/tAQgCMJmURQfh0F4TOuiGVhuXVoCGBkZ+bnL5doqCAJDRZdp3XLNRts/LQFEC3Sl6jIAkvU/wZU6g8vtN5MBmQxI0r/F50tV9BW+gEHFOxCKN8VU//7N6HlvE6zZm2Db+g6sOS/M12+89Sm9BNBf+iJERguBmYbAzMRW8Qycf56BddsMrNnTsGZrwW95MV6z0bZLLQCxeMOs6eD3A/T9YSwNFAL8+8FvAKzZFMaGaMbirUsxgJItofeGsYzL7YNFQPd2GQB9/7clXrPRtssASOUoADGTAZlLIHMPkD+ekG9yscrMTTAzCmSGwcw8IDMRyswEn5WpcPHGZT8M2bZtjDbHj7cuqc8C9E2wLBogxOKXIDDfQ2BIzKfA4PyAwLmHPgARBD+E/A7mD14KmAVWKX/8QkyJNPxKrLoDb9QaJXWtQfoyXNUdOHmic7T1stXyoNlmQiw1WUz+pk7ddJPppv+SqX3ihPFeK+3jiEE6/UmbdPaj6zibq8XZ7VfRsOMq3sr6EUqsTFjxDKg2Yl2tgbhqDQTRVGMAqpcoum94nwduEnxwDdh+NaB7H17HmykHUGuQasKDXMnl6g6CXa3A+0EAyL2KYwkDUFdRt1OtVCFM1zZnZcV8WVnTLn1WYyCo6VhhGQgogN2twHvakD6PBYB6UCtV10K+DqqgrqjbGdqv9z7WOnzYfbOz/0qTth1B6dFyo6u3577/oN2LcocXFdFE21oGiPGikyBZ+rKb4IQVATXaiSlWfNRDyw1Lb5NWj0tN7Th/uR3N+v4mnQt7DXfxSpbdQ3R2D4HdCzgiFKinbQvI4SFIqrwEzlnR4y4Um9wm+6IeTcNAmxiUToSRAoirk2dlO8sICQGgIGIAAG57gloIQDxnxOkB+jwALRfqa0ltXuC2b36F97kIAECvexx373ZCGLoNx+h01MBvjRJ8O0hwpY+gczh4OYQfkC7TVG3xTqDeJ+Ky14fbicy6UYJB+0MMdY4FZRrDUNsohv7txtC/3BA7x+C4L4VijxMANf8QE041iDUHku1DuAevhDoJN/j1LYKdLUDuNaBSD5hH5kKgZ/yS14dXxrVYNXEOvxy/iC989xKTCV6CO8JjPDrlCP5CpYEH4Wwgig6QwuAn9v5yIwZtE7D7gpkXFwCa9vSsE1suYN0KWP+AR7dK0et+AHtYCvNuggM3g0MSnZzQSYr2TvAmJUPq9QCFYz3ImvgKWRNfB8p3/2MIZIW8zZJLL8FA3xT8n9968hOdiN8YSMV6uIy+wCVCjxMXAGqyf8QFf/cewPJuQA8cR+EYfTwnC2j609lazuy4TMfofwoEDu+TGysFcNQ3gNUT52YhnMW+se6EZUD/nf/Cf/wWwNkAjQ1QWQGmHfi4LSCpSA/xh7HFAqAGJAy59Ji0H8aEsx4DwwNzzj6lSa/tNhfBESPwiQ44bye4PfrEvLyN2TON/DEer4+3YvtYJ3TeqcRkgIfAOeyH7+oQps71YfLcHUye7cOkphuTx2yYOmbD+F8d6Ot/BPvsSYkzA2QTCJx1h8f/lHk5bSkEmgnd7rnXvtwuQ6ClxeMP3ADjHb/D+1ho2eGW4ByZeaJ7fjhnFX4DDMSwuGFQBvHslNEyYHwhus9aW9fwnInQwyy7R6qye8j/BYQeN0HH3dBU+KHehdr/AdTjtdRqT268AAAAAElFTkSuQmCC',
	category: 'minecraft',
	target: 'Minecraft: Java Edition',
	format_page: {
		content: [
			{type: 'h3', text: tl('mode.start.format.informations')},
			{text: `* ${tl('format.java_block.info.rotation')}
					* ${tl('format.java_block.info.size')}
					* ${tl('format.furniture_core.info.properties')}`.replace(/\t+/g, '')
			}
		]
	},
	render_sides: 'front',
	model_identifier: false,
	parent_model_id: false,
	vertex_color_ambient_occlusion: true,
	rotate_cubes: true,
	rotation_limit: true,
	rotation_snap: true,
	optional_box_uv: true,
	uv_rotation: true,
	java_cube_shading_properties: true,
	java_face_properties: true,
	cullfaces: true,
	animated_textures: true,
	select_texture_for_particles: true,
	texture_mcmeta: true,
	display_mode: true,
	texture_folder: true,
	cube_size_limiter: {
		coordinate_limits: [-16, 32],
		test(cube, values = 0) {
			let from = values.from || cube.from;
			let to = values.to || cube.to;
			let inflate = values.inflate == undefined ? cube.inflate : values.inflate;

			return undefined !== from.find((v, i) => {
				return (
					to[i] + inflate > 32 ||
					to[i] + inflate < -16 ||
					from[i] - inflate > 32 ||
					from[i] - inflate < -16
				)
			})
		},
		move(cube, values = 0) {
			let from = values.from || cube.from;
			let to = values.to || cube.to;
			let inflate = values.inflate == undefined ? cube.inflate : values.inflate;
			
			[0, 1, 2].forEach((ax) => {
				var overlap = to[ax] + inflate - 32
				if (overlap > 0) {
					//If positive site overlaps
					from[ax] -= overlap
					to[ax] -= overlap

					if (16 + from[ax] - inflate < 0) {
						from[ax] = -16 + inflate
					}
				} else {
					overlap = from[ax] - inflate + 16
					if (overlap < 0) {
						from[ax] -= overlap
						to[ax] -= overlap

						if (to[ax] + inflate > 32) {
							to[ax] = 32 - inflate
						}
					}
				}
			})
		},
		clamp(cube, values = 0) {
			let from = values.from || cube.from;
			let to = values.to || cube.to;
			let inflate = values.inflate == undefined ? cube.inflate : values.inflate;
			
			[0, 1, 2].forEach((ax) => {
				from[ax] = Math.clamp(from[ax] - inflate, -16, 32) + inflate;
				to[ax] = Math.clamp(to[ax] + inflate, -16, 32) - inflate;
			})
		}
	},
	codec
})
codec.format = format;

BARS.defineActions(function() {
	new Action('export_furniture_core_model', {
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADcklEQVRYCe2XXWiTVxjHvZLtStjtZLa1g7EbLyre+FGxCruYKEojfqGCeOdaHINUrXmdrMmqUtvUpIkX1kpa/Bjzwl3sRmFqp9L6gfjVsVWW1FJrrLPD1iL96f89eW1Nm7RpDCgY+POenJP3PL/zPM85ec60ae/7h95wMb0hi96QJwNZxPZsonPxJ1mvj96Gva8Nk5nCEC1/wf0lFrdLp2cFkVh95gD/fgcdJYP8+U0jlaV7cLssdiZUsWYvFaXFkwKbMkC0TABwdxmcWA67XFAxSjtdVm4BjAegYyncWwonkyDcLk9uAaI7oGOJ8cJfJXCvBE5+C7tLjSdyDtBTw9A/ZfRc20J322a62zfz8OoWngU2gtsl5dID2jVhhh+FGYwFeB49bNQVoKelnKEfVmcAEA96eNxA9gpBPEx3SznPv1/1NkCBjxn5B5iVrE8tZt6882tNV2eEbBTrjPCs6+gbgIFkgC99lBX6iBZ6eSAVeHmQV2U05+Dg0wV1/Sz0G82v62e00vUvqu9HWuD/H//Z8ww/CtgeGANQ6MUq9IFU4IVVx6DuItRfMs9DF2DFUVgbMX21F0HSuPo0pu/+hNRe2Qj5VWa+vCpwN51j6KE/BcDPeBwAvXT4EtzogtoL8Mst+G8Atp4yxjTWHjNSWwCCvRYbAXDamkvz5nuh4rgA6icGkAc2tMC6ZpjthWNtcLwdvqo2q/nipxFDas9KAAvi831GagtuSgBOGOS27WegLQrFQWPcXk3CoGNARuR6ecUJQVYecABkVMYFIRh5ZjIAAhOI8ujNO5mEQEbkbrm96bX7FQaFQ2HRalOFQEY1pt9IjnEbOhMAvbzttEk8JaASUQkpA0o4rTA5CdUXaB2JuYyO1sRJOM42lGEZdbbiisYEQKvJejvRWmFdxPSvbzbZPtsHycqbyAPpDqKvfQNPi6rjzN3/xFZR9RNGy+nXc96B8VW0v48fI7/xItU2THUUf2Yx8/c/mmrarwRpy0aXg3Rcr+VlT8P450C6woB46J3/GY05itMCmIo4w5owRRGb+Df8CPCheSBxMXkctgsKVTVTVt8RexeMqYjSJ2FwMfGQ1Xeu8nx3c5k9gcqqqervqg0MZlITOnADO1Z6FLtspJXL+LAuKJO9mDgAukrZVyu3y6OSOivpijbZq5kDkKvnK8ucBfyhzHctAAAAAElFTkSuQmCC',
		category: 'file',
		condition: () => Format == format,
		click: function () {
			codec.export();
		}
	})
	new Action('import_furniture_core_model', {
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFT0lEQVRYCe2WfUwTZxzH2WaWzJn95eZeXbI/zOp/mzNZlpiYbQ7j2zazkugf24RaoG+HEyqHVVFAixSLDNaWUqDQlusBC7rN6T9zZn1BYPTlylvkCJvoPIhkQrkW2nt+yxWqOMpQNPjPmnzzPH1y1/s83+f3+16TnBRd46ToUZd/UJj0JD5OakDjpGjkpOg/HX5627IztF279oLDT2udFA1Oih52UvT2ZYe45Lv1vJOiy2aduO6iBj54MhABmuSdcFGD2csOwD/QFaCP8wAOaiDniQA4/YMFiQDART4HXvM6oAjBlNsooFTbBW7J+4KbhErArwFVLwCv7rVwS+ZbU6R8/QQhEVCqjwVuybuCoeLPBVOERMCvs42SNwCSnlpwcwsC+Bs+Q37LTURZmemrRsZ3dCvjlm1kmCacgYCNQZR1JNKm72VJxRBrl41M2qVM97FPGLd0I0OrdzEsKWdYu3yUtcscQRu25uEBKGsa8lsAUVaYumoEryoZ3JINwJA4QMAWW4+26YBtUgBrl8EkIYXuo1vAJdkAtHoXsKQ8ts7aZX+EWqRvLgHAkhoD8Fsg0mmCgW+/gp5Tu2Hsp0IAypoQYLD4U6BUH8H1shRgSdkMACEbCpGKtY8EwINEPWaIeuqA89ZD3Jm5DsRcaJTAJC9CGt89sI8LIO7G3ZGywr8BeIh5+h9g6Q7MdgHfCYn0oEew5C7wWb5AXvMU8tQhzlOHIp01KNJpQtGuWoQ8ZoS8ZhRt++5GqPnAONuMIbYJQ8FGKZqwZqBJQoZCzVm8IERi1JJyINyavTPUqpwMnzvEBVsOcn3q3Zw/fxvH1Ii58PlDXKhVicIXjvRE2w0jXLsBRa/qucGyvZxHuYm7YcrkuI4qLtpugGiHsQM6Dasfug1DpCyNtc+003hDOnhyNoFL+h4Mn02BEN/jhBTCP+CAfPWxTODbs/e0EJwZ78BQVfpMWPmtgHzWIeixPnwQhezy1HhLTVgzIHBkC3TlbIKblXshxKdcHGA2F3gAuuJr6Mr9EIbrsZmw4mvHZxmCbvPCQXSlq6/giqcffvX0KefaNBeAJWRwpyEd7tSLIWjLnE24WQfiweS3xCI77NbDdIfpXuEuBnDB6Sn62emFi27/wgAJA2Y+AP/eiGlu1ywG0HTRUUReckDD+V+qi42W1+Mu3OfAgwLMfXB8vhjAmRp7wRmTHcpqm6Kl1USXpoZcz0MsG4CmurHgbF0zWH+8DNpaEjQme8ayApw12gq11QSU1zYBP2qNtqwYACH/kiVkHF+AiSWF8Hk8iLz108gXq3a+4ufL23ANfjOvhaSkp2Hz5hXxI06C/PwVIJLn/KXI6+9XnoB+5XHgx1EF7oU0jIzKsCuRPMV05LACLaRo3oFRVHQsiIqPowUE6MSREbRffg7t2PM9Sha2cskpM8UOEskqJMLaQYQBpCnuSYQBiisNA7SYUhWA/kOQqgDYJwduxx7gkoW8fo+5AML8ZzkRpkMirDcizuq7nZkd/Dvj4BgSYYFH1n6sm/8NToT1jGVmj4+lfzPO7djbyyULe7mtKfp7xyAWrxyVKV8tPVmuLVRXsEXqitGKAm0miMWrYZ/8xUfRREb2S2Uny1VF6opxXuUnzqhg1541sHPnyrsA/ATXGN7GNfpbJSY7FOkaILdU75BUVq6676IlfMnSGl7J1ej71FU24JWr0fdiZcb5/47x0qp1eRr9cHGVDQorzYCX6C7nPwaAnNOVL+MafeCU3gK88BIdlZcIQEiSz+SV6g7jJboJvER3A9fody9hwwlvwUt16XiJ7javwxqDOH7RP5C/EPRyiG2AAAAAAElFTkSuQmCC',
		category: 'file',
		condition: () => Format == format,
		click: function () {
			Blockbench.import({
				resource_id: 'model',
				extensions: ['zip'],
				type: codec.name,
				readtype: 'binary',
				multiple: false,
			}, function(files) {
				files.forEach(file => {		
					codec.parse(file.content, file.path, true)
				})
			})
		}
	})
})

})()