(function() {

/**
 * Class representing a texture in a resource pack.
 */
class PackTexure {
    /**
     * Constructs a new instance of the class.
     *
     * @param {string} file_path - The file path of the resource, must have at least 4 parts and follow the format 'assets/<namespace>/textures/...'.
     * @param {string} content_base64 - The base64 encoded content of the resource.
     * @throws {Error} If the file path does not have at least 4 parts.
     * @throws {Error} If the first part of the file path is not 'assets'.
     * @throws {Error} If the third part of the file path is not 'textures'.
     */
    constructor(file_path, content_base64) {
        const parts = file_path.split('/');
        if (parts.length < 4) {
            throw new Error('Invalid file path, must have at least 4 parts (%s)', file_path);
        }
        if (parts[0] !== 'assets') {
            throw new Error('Invalid file path, first part must be "assets" (%s)', file_path);
        }
        if (parts[2] !== 'textures') {
            throw new Error('Invalid file path, third part must be "textures" (%s)', file_path);
        }
        this._nameSpace = parts[1];
        this._path = parts.slice(3).join('/').replace(/\.png$/, '');
        this._content_base64 = content_base64;
    }

    /**
     * Set the namespace of the texture.
     * @param {string} nameSpace - The namespace to set.
     */
    set nameSpace(nameSpace) {
        this._nameSpace = nameSpace;
    }

    /**
     * Set the path of the texture.
     * @param {string} path - The path to set.
     */
    set path(path) {
        this._path = path;
    }

    /**
     * Set the base64 content of the texture.
     * @param {string} content_base64 - The base64 content to set.
     */
    set content_base64(content_base64) {
        this._content_base64 = content_base64;
    }

    /**
     * Get the namespace of the texture.
     * @return {string} The namespace of the texture.
     */
    get nameSpace() {
        return this._nameSpace;
    }

    /**
     * Get the path of the texture.
     * @return {string} The path of the texture.
     */
    get path() {
        return this._path;
    }

    /**
     * Get the base64 content of the texture.
     * @return {string} The base64 content of the texture.
     */
    get content_base64() {
        return this._content_base64;
    }

    /**
     * Get the reference path of the texture.
     * @return {string} The reference path of the texture.
     */
    get reference_path() {
        if (!this._nameSpace) {
            return this._path;
        } else {
            return `${this._nameSpace}:${this._path}`;
        }
    }

    /**
     * Get the file path of the texture.
     * @return {string} The file path of the texture.
     */
    get file_path() {
        return `assets/${this._nameSpace}/textures/${this._path}.png`;
    }
}

/**
 * Extracts all PNG textures from a ZIP file and returns them as an array of PackTexture objects.
 *
 * @param {Object} zipFile - The ZIP file object containing the textures.
 * @returns {Promise<PackTexture[]>} A promise that resolves to an array of PackTexture objects.
 */
async function getAllTextures(zipFile) {
    const textures = [];
    for (const path in zipFile.files) {
        if (path.endsWith('.png')) {
            try {
                const content = await zipFile.file(path).async('base64');
                const texture = new PackTexure(path, content);
                textures.push(texture);
            } catch (error) {
                console.debug(`Failed to process texture at path ${path}:`, error);
            }
        }
    }
    return textures;
}

/**
 * Merges Optifine models by recursively merging parent JSON objects into their children.
 *
 * @param {Object} jsonObjects - An object containing JSON objects keyed by their paths.
 * @param {string} path - The path of the JSON object to merge.
 * @returns {Promise<void>} A promise that resolves when the merging is complete.
 */
async function mergeOptfineModels(jsonObjects, path) {
    const jsonObject = jsonObjects[path];
    if (jsonObject.parent) {
        let parentPath;
        if (jsonObject.parent.startsWith('./')) {
            parentPath = path.substring(0, path.lastIndexOf('/')) + jsonObject.parent.substring(1);
        } else if (jsonObject.parent.startsWith('../')) {
            const parentSplit = jsonObject.parent.split('/');
            const pathSplit = path.split('/');
            let i = pathSplit.length - 1;
            let j = parentSplit.length - 1;
            while (parentSplit[j] === '..') {
                i--;
                j--;
            }
            parentPath = pathSplit.slice(0, i).join('/') + '/' + parentSplit.slice(j).join('/');
        } else {
            parentPath = jsonObject.parent;
        }

        let parentJsonObject = jsonObjects[parentPath];
        if (parentJsonObject.parent) {
            await mergeOptfineModels(jsonObjects, parentPath); // Recursively merge the parent's parent
            parentJsonObject = jsonObjects[parentPath]; // Update the parent JSON object after merging
        }
        // Merge the parent and child JSON objects
        const mergedJsonObject = { ...parentJsonObject, ...jsonObject };
        delete mergedJsonObject.parent; // Remove the parent key after merging

        jsonObjects[path] = mergedJsonObject;
    }
}

class PackModel {
    /**
     * Constructs a new instance of the class.
     *
     * @param {string} file_path - The file path of the model, must have at least 4 parts and follow the format 'assets/<namespace>/models/...'.
     * @param {Object} jsonObject - The JSON object of the model.
     * @throws {Error} If the file path does not have at least 4 parts.
     * @throws {Error} If the first part of the file path is not 'assets'.
     * @throws {Error} If the third part of the file path is not 'models'.
     */
    constructor(file_path, jsonObject) {
        const parts = file_path.split('/');
        if (parts.length < 2) {
            throw new Error('Invalid file path, must have at least 2 parts (%s)', file_path);
        }
        if (parts[0] !== 'assets') {
            throw new Error('Invalid file path, first part must be "assets" (%s)', file_path);
        }
        this._nameSpace = parts[1];
        this._jsonObject = jsonObject;
        this._modelName = parts.pop();
    }

    set nameSpace(nameSpace) {
        this._nameSpace = nameSpace;
    }

    set jsonObject(jsonObject) {
        this._jsonObject = jsonObject;
    }

    set modelName(modelName) {
        this._modelName = modelName;
    }

    get nameSpace() {
        return this._nameSpace;
    }

    get jsonObject() {
        return this._jsonObject;
    }

    get modelName() {
        return this._modelName;
    }

}


/**
 * Retrieves all Optifine model JSON files from a given zip file.
 *
 * @param {Object} zipFile - The zip file object containing the resource pack files.
 * @returns {Promise<Array>} A promise that resolves to an array of PackModel instances representing the Optifine models.
 */
async function getAllOptfinePackModels(zipFile) {
    if (!zipFile.file('assets/minecraft/optifine/color.properties')) {
        return [];
    }
    const jsonObjects = {};
    for (const path in zipFile.files) {
        if (path.includes('optifine') && path.endsWith('.json')) {
            const content = await zipFile.file(path).async('string');
            jsonObjects[path.replace(/\.json$/, '')] = JSON.parse(content);
        }
    }
    const packModels = [];
    for (const path in jsonObjects) {
        await mergeOptfineModels(jsonObjects, path);
    }
    // remove display key
    for (const path in jsonObjects) {
        const json = jsonObjects[path];
        const jsonWithoutDisplay = {};
        for (const key in json) {
            if (key === 'display') {
                continue;
            }
            jsonWithoutDisplay[key] = json[key];
        }
        const packModel = new PackModel(path, jsonWithoutDisplay);
        packModels.push(packModel);
    }
    return packModels;
}

async function generateFurnitureCoreModels(packModel, texturesList) {
    const modelZip = new JSZip();
    if (!packModel.jsonObject.textures) {
        modelZip.file('model.json', JSON.stringify(packModel.jsonObject));
        return modelZip;
    }
    for (const key in packModel.jsonObject.textures) {
        const texturePath = packModel.jsonObject.textures[key];
        var texture;
        for (const packTexture of texturesList) {
            if (!packModel.nameSpace.includes(':')) {
                if (packModel.nameSpace !== packTexture.nameSpace) {
                    continue;
                }
                if (packModel.nameSpace + ':' + texturePath === packTexture.reference_path) {
                    texture = packTexture;
                    break;
                }
            } else {
                if (texturePath === packTexture.reference_path) {
                    texture = packTexture;
                    break;
                }
            }
        }
        if (!texture) {
            console.warn(`Texture not found for key ${key} in model ${packModel.modelName}`);
            continue;
        }
        const textureFileName = texturePath.split('/').pop();
        packModel.jsonObject.textures[key] = textureFileName;
        modelZip.file(textureFileName + '.png', texture.content_base64, { base64: true });
    }
    modelZip.file('model.json', JSON.stringify(packModel.jsonObject));
    return modelZip.generateAsync({ type: 'blob' });
}


async function unpackResourcePack(zipFileContent) {
    const modelZips = {};   // Array of JSZip objects of furniture core models

    // 1. unpack the resource pack
    const zip = new JSZip();
    const zipFile = await zip.loadAsync(zipFileContent);

    // 2. get all textures
    console.log('Getting all textures');
    const textures = await getAllTextures(zipFile);
    console.log('Textures count:', textures.length);

    // 3. get all models json  |  autoParseJSON autoStringify
    // todo

    // 4. get all optifine models json
    console.log('Getting all optifine pack models');
    const optfinePackModels = await getAllOptfinePackModels(zipFile);
    console.log('Optifine pack models count:', optfinePackModels.length);

    // 5. build furniture core models
    console.log('Building furniture core models');
    for (const optfinePackModel of optfinePackModels) {
        const modelZip = await generateFurnitureCoreModels(optfinePackModel, textures);
        modelZips[optfinePackModel.modelName] = modelZip;
    }
    console.log('Furniture core models count:', Object.keys(modelZips).length);
    
    return modelZips;
}


BARS.defineActions(function() {
    new Action('import_resource_pack', {
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKWSURBVFiFxZdNSFRRGIaf79yZKU0sDAoM2pRa0Caw6IdCodKWWrMIJdRJC2oVtcqIqBZt2lk4UaskaNJFkjQFEREVFEQUlRohglCR/Wjo6Mycr0Vj/k+be6/v8tyP+zzc8/OdCwsc8eKlxfHWdSpyRZRYT0XT5Wy1xgsBkCpRyoCWonj0RmFna66vAgrOPxWoyQvJ07VdrWvmqpWS+61hVXa5aiCyEWXTjNHvoramu/LIvWmlxfFoAljkqsD8sQpnevc0XkBEJwTUJ/hkhLvjwWBtX3n9TymOR9VByDEOv23KRwvtNk5yuwEoDOWwJa/ARziAlFgNrjcARiDfCbJ5SQHLnKAf9LTCyZ7dh58EAL4kx/gwOgwCSbUes2VQ4UBvReMDgICibxM2veFdYshjMIC8TBm779Puw/0TIwFNj5VKKG+Vq5xU6ijC8alDCteTocDRvvL6xDQlV8GZFMWjzQLnJnREae6ubLo4V23ACwFBvoICDFhrwx/3Hnk2X60nAj2/ll4ryv8x4ASSz3sqjg1mq/3vFGjVweWY4DbMUJfEYmn3NP8mazfUcMNWTOg1yB3s0ojb8KwCuu9QE9Y8Av7uEJUVXgjMmgKtq1vMcLAFtGHGk0ugLa7SR5YMTBPQcNNqrG0HSl0FzZ83/wS0OrITI7dQVvoEBzJrQPdHTiDy0G84gOj+QztQHvsJ/ZG25BrDIgFD0LwHuv0AKzCuyqhVUpmua+Rm9BtJuwm03WuBhFU+p9KkVHEyG3ByEYJQ3XgK0bN49r8w22n2OVAVqcRIGzDzjvYCeOUuX+7P2Qsy58FtmHK3VzktHVfPuyswz6eWWLSfcVOG0jY5al1vRJClHUtndASo1erGp4iGcbTDC4EFzx8WL+ORGqCS8gAAAABJRU5ErkJggg==',
        category: 'file',
        click: function () {
            console.log('import_resource_pack')

            form = {
                info: {
                    type: 'info',
                    text: 'dialog.import_resource_pack.info'
                },
                open_in_editor: {
                    type: 'checkbox',
                    label: 'dialog.import_resource_pack.open_in_editor',
                    description: 'dialog.import_resource_pack.open_in_editor.desc',
                    value: false
                }
            }

            var dialog = new Dialog({
				id: 'import_resource_pack',
				title: 'action.import_resource_pack',
				width: 500,
				form,
                buttons: [tl('dialog.import_resource_pack.import'), tl('dialog.import_resource_pack.cancel')],
                cancel_on_click_outside: true,
				onConfirm: function(formResult) {
                    const openInEditor = formResult.open_in_editor;

                    codec = Codecs['furniture_core']
                    Blockbench.import({
                        resource_id: 'model',
                        extensions: ['zip'],
                        type: codec.name,
                        readtype: 'binary',
                        multiple: false,
                    }, function(files) {
                        for (const file of files) {
                            console.log('file:', file);
                            unpackResourcePack(file.content).then(async modelZips => {
                                const zip = new JSZip();
                                for (const key in modelZips) {
                                    const modelZip = modelZips[key];
                                    const file = {
                                        path: key + '.zip',
                                        content: modelZip
                                    }
                                    if (openInEditor) {
                                        await codec.load(modelZip, file);
                                    } else {
                                        zip.file(key + '.zip', modelZip);
                                    }
                                }
                                if (!openInEditor) {
                                    zip.generateAsync({ type: 'blob' }).then(function(blob) {
                                        Blockbench.export({
                                            resource_id: 'model',
                                            type: codec.name,
                                            extensions: ['zip'],
                                            name: 'exported',
                                            startpath: 'export.zip',
                                            content: blob,
                                            custom_writer: isApp ? (a, b) => this.write(a, b) : null,
                                        }, path => this.afterDownload(path));
                                    });
                                }
                            });
                        }
                    })
                }
            })

            dialog.show();
        }
    })
})

})()