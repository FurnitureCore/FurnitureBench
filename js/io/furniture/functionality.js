class Functionality {
    constructor(id) {
        this.id = id;
        this._name = tl('furniture_functionality.' + id + '.name');
        this._description = tl('furniture_functionality.' + id + '.desc');
    }

    get name() {
        return this._name;
    }

    get description() {
        return this._description;
    }

    json() {
        return '';
    }

    addForm(form) {}

    getFromResult(formResult) {}

    load(json) {}
}

class None extends Functionality {
    constructor() {
        super('none');
    }

    json() {
        return {
            type: 'none'
        }
    }

    addForm(form) {
        Object.assign(form, {
            none_desc: {
                label: '',
                type: 'info', 
                text: this.description,
                condition: (form) => (form.functionality == 'none')
            }
        });
    }

    load(json) {
    }

    getFromResult(formResult) {}
}

class WorkBlockType {
    constructor(id) {
        this.id = id;
        this._name = tl('furniture_functionality.work_block.' + id + '.name');
    }

    get name() {
        return this._name;
    }
}

let WorkBlockTypes = {
    workbench: new WorkBlockType('workbench'),
    furnace: new WorkBlockType('furnace'),
    smoker: new WorkBlockType('smoker'),
    blast_furnace: new WorkBlockType('blast_furnace'),
    brewing_stand: new WorkBlockType('brewing_stand'),
    loom: new WorkBlockType('loom'),
    stonecutter: new WorkBlockType('stonecutter'),
    smith: new WorkBlockType('smith'),
    grindstone: new WorkBlockType('grindstone'),
}

let WorkBlockOptions = {
    workbench: new WorkBlockType('workbench').name,
    furnace: new WorkBlockType('furnace').name,
    smoker: new WorkBlockType('smoker').name,
    blast_furnace: new WorkBlockType('blast_furnace').name,
    brewing_stand: new WorkBlockType('brewing_stand').name,
    loom: new WorkBlockType('loom').name,
    stonecutter: new WorkBlockType('stonecutter').name,
    smith: new WorkBlockType('smith').name,
    grindstone: new WorkBlockType('grindstone').name,
}

class WorkBlock extends Functionality {
    constructor() {
        super('work_block');
        this._block = WorkBlockTypes.workbench;
    }

    set block(value) {
        this._block = value;
    }

    get block() {
        return this._block;
    }

    json() {
        return {
            type: 'work_block',
            block: this.block.id
        }
    }

    addForm(form) {
        Object.assign(form, {
            work_block_desc: {
                label: '',
                type: 'info', 
                text: this.description,
                condition: (form) => (form.functionality == 'work_block')
            },
            block: {
                label: 'furniture_functionality.work_block.select.label', 
                type: 'select', 
                value: this.block.id,
                options: WorkBlockOptions,
                condition: (form) => (form.functionality == 'work_block')
            }
        });
    }

    getFromResult(formResult) {
        this.block = WorkBlockTypes[formResult.block];
    }

    load(json) {
        this.block = WorkBlockTypes[json.block] || WorkBlockTypes.workbench;
    }
}

class Illumination extends Functionality {
    constructor() {
        super('illumination');
        this._light_level = 15;
        this._switchable = false;
    }

    set light_level(value) {
        if (value < 0) {
            value = 0;
        }
        if (value > 15) {
            value = 15;
        }
        this._light_level = value;
    }

    get light_level() {
        return this._light_level;
    }

    set switchable(value) {
        this._switchable = value;
    }

    get switchable() {
        return this._switchable;
    }

    json() {
        return {
            type: 'illumination',
            light_level: this.light_level,
            switchable: this.switchable
        }
    }

    addForm(form) {
        Object.assign(form, {
            illumination_desc: {
                label: '',
                type: 'info', 
                text: this.description,
                condition: (form) => (form.functionality == 'illumination')
            },
            light_level: {
                label: 'furniture_functionality.illumination.light_level.label', 
                type: 'number', 
                value: this.light_level,
                min: 0,
                max: 15,
                condition: (form) => (form.functionality == 'illumination')
            },
            switchable: {
                label: 'furniture_functionality.illumination.switchable.label', 
                type: 'checkbox', 
                value: this.switchable,
                condition: (form) => (form.functionality == 'illumination')
            }
        });
    }

    getFromResult(formResult) {
        this.light_level = formResult.light_level;
        this.switchable = formResult.switchable;
    }

    load(json) {
        this.light_level = json.light_level || 15;
        this.switchable = json.switchable || false;
    }
}

class Storage extends Functionality {
    constructor() {
        super('storage');
        this._slots = 0;
    }

    set slots(value) {
        this._slots = Math.ceil(number(value) / 9) * 9;
    }

    get slots() {
        return this._slots;
    }

    json() {
        return {
            type: 'storage',
            size: this.slots
        }
    }

    addForm(form) {
        Object.assign(form, {
            storage_desc: {
                label: '',
                type: 'info', 
                text: this.description,
                condition: (form) => (form.functionality == 'storage')
            },
            slots: {
                label: 'furniture_functionality.storage.slots.label', 
                type: 'select', 
                value: this.slots,
                options: {
                    9: '9',
                    18: '18',
                    27: '27',
                    36: '36',
                    45: '45',
                    54: '54',
                },
                condition: (form) => (form.functionality == 'storage')
            }
        });
    }

    getFromResult(formResult) {
        this.slots = number(formResult.slots);
    }

    load(json) {
        this.slots = json.size || 9;
    }
}

class Chair extends Functionality {
    constructor() {
        super('chair');
        this._height = 0.0;
    }

    set height(value) {
        this._height = value;
    }

    get height() {
        return this._height;
    }

    json() {
        return {
            type: 'chair',
            height: this.height
        }
    }

    addForm(form) {
        Object.assign(form, {
            chair_desc: {
                label: '',
                type: 'info', 
                text: this.description,
                condition: (form) => (form.functionality == 'chair')
            },
            height: {
                label: 'furniture_functionality.chair.height.label', 
                type: 'number', 
                value: this.height,
                condition: (form) => (form.functionality == 'chair')
            }
        });
    }

    getFromResult(formResult) {
        this.height = formResult.height;
    }

    load(json) {
        this.height = json.height || 0.0;
    }
}

let Functionalities = {
    none: new None(),
    work_block: new WorkBlock(),
    illumination: new Illumination(),
    storage: new Storage(),
    chair: new Chair(),
}

let FunctionalityOptions = {
    none: new None().name,
    work_block: new WorkBlock().name,
    illumination: new Illumination().name,
    storage: new Storage().name,
    chair: new Chair().name,
}

function addAllFuntionalityFroms(form) {
    for (let key in Functionalities) {
        Functionalities[key].addForm(form);
    }
}