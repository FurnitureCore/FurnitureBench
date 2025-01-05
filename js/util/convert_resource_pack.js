(function() {

/**
 * Class representing a texture in a resource pack.
 */
class PackTexure {
    /**
     * Create a PackTexure.
     */
    constructor(nameSpace, path, content_base64) {
        /**
         * @private
         * @type {string}
         */
        this._nameSpace = nameSpace

        /**
         * @private
         * @type {string}
         */
        this._path = path

        /**
         * @private
         * @type {string}
         */
        this._content_base64 = content_base64
    }

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
        return `${this._nameSpace}:${this._path}`;
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
            const content = await zipFile.file(path).async('base64');
            const texture = new PackTexure(path, content);
            textures[texture.reference_path] = texture;
        }
    }
    return textures;
}

async function mergeModels(jsonObjects, path) {
    const jsonObject = jsonObjects[path];
    if (jsonObject.parent) {
        if (jsonObject.parent.startsWith('minecraft:')) {
            return;
        }
        var parentPath;
        if (jsonObject.parent.startsWith('./')) {
            parentPath = path.substring(0, path.lastIndexOf('/')) + jsonObject.parent.substring(1);
        }
        if (jsonObject.parent.startsWith('../')) {
            const parentSplit = jsonObject.parent.split('/');
            const pathSplit = path.split('/');
            let i = pathSplit.length - 1;
            let j = parentSplit.length - 1;
            while (parentSplit[j] === '..') {
                i--;
                j--;
            }
            parentPath = pathSplit.slice(0, i).join('/') + '/' + parentSplit.slice(j).join('/');
        }
        var parentJsonObject = jsonObjects[parentPath];
        if (parentJsonObject.parent) {
            await mergeModels(jsonObjects, parentPath);
            parentJsonObject = jsonObjects[parentPath];
        }
        // Merge the parent and child JSON objects
        const mergedJsonObject = {};
        for (const key in parentJsonObject) {
            mergedJsonObject[key] = parentJsonObject[key];
        }
        for (const key in jsonObject) {
            if (key === 'parent') {
                continue;
            }
            mergedJsonObject[key] = jsonObject[key];
        }
        jsonObjects[path] = mergedJsonObject;
    }
}

async function getAllOptfineModelsJson(zipFile) {
    if (!zipFile.file('assets/minecraft/optifine/color.properties')) {
        return [];
    }
    const jsonObjects = {};
    for (const path in zipFile.files) {
        if (path.startsWith('assets/minecraft/optifine/') && path.endsWith('.json')) {
            const content = await zipFile.file(path).async('string');
            jsonObjects[path] = JSON.parse(content);
        }
    }
    for (const path in jsonObjects) {
        await mergeModels(jsonObjects, path);
    }
    return Object.values(jsonObjects);
}


async function unpackResourcePack(zipFileContent) {
    const modelZips = [];   // Array of JSZip objects of furniture core models

    // 1. unpack the resource pack
    const zip = new JSZip();
    const zipFile = await zip.loadAsync(zipFileContent);

    // 2. get all textures
    const textures = await getAllTextures(zipFile);

    // 3. get all models json  |  autoParseJSON autoStringify
    // todo

    // 4. get all optifine models json
    const optfineModelsJson = await getAllOptfineModelsJson(zipFile);

    // 5. todo build furniture core models
    
    return modelZips;
}


BARS.defineActions(function() {
    new Action('import_resource_pack', {
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKWSURBVFiFxZdNSFRRGIaf79yZKU0sDAoM2pRa0Caw6IdCodKWWrMIJdRJC2oVtcqIqBZt2lk4UaskaNJFkjQFEREVFEQUlRohglCR/Wjo6Mycr0Vj/k+be6/v8tyP+zzc8/OdCwsc8eKlxfHWdSpyRZRYT0XT5Wy1xgsBkCpRyoCWonj0RmFna66vAgrOPxWoyQvJ07VdrWvmqpWS+61hVXa5aiCyEWXTjNHvoramu/LIvWmlxfFoAljkqsD8sQpnevc0XkBEJwTUJ/hkhLvjwWBtX3n9TymOR9VByDEOv23KRwvtNk5yuwEoDOWwJa/ARziAlFgNrjcARiDfCbJ5SQHLnKAf9LTCyZ7dh58EAL4kx/gwOgwCSbUes2VQ4UBvReMDgICibxM2veFdYshjMIC8TBm779Puw/0TIwFNj5VKKG+Vq5xU6ijC8alDCteTocDRvvL6xDQlV8GZFMWjzQLnJnREae6ubLo4V23ACwFBvoICDFhrwx/3Hnk2X60nAj2/ll4ryv8x4ASSz3sqjg1mq/3vFGjVweWY4DbMUJfEYmn3NP8mazfUcMNWTOg1yB3s0ojb8KwCuu9QE9Y8Av7uEJUVXgjMmgKtq1vMcLAFtGHGk0ugLa7SR5YMTBPQcNNqrG0HSl0FzZ83/wS0OrITI7dQVvoEBzJrQPdHTiDy0G84gOj+QztQHvsJ/ZG25BrDIgFD0LwHuv0AKzCuyqhVUpmua+Rm9BtJuwm03WuBhFU+p9KkVHEyG3ByEYJQ3XgK0bN49r8w22n2OVAVqcRIGzDzjvYCeOUuX+7P2Qsy58FtmHK3VzktHVfPuyswz6eWWLSfcVOG0jY5al1vRJClHUtndASo1erGp4iGcbTDC4EFzx8WL+ORGqCS8gAAAABJRU5ErkJggg==',
        category: 'file',
        click: function () {
            console.log('import_resource_pack')
            // todo
        }
    })
})

})()