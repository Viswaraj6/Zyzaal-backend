const ImageKit = require("@imagekit/nodejs");
const { toFile } = require("@imagekit/nodejs");

const imagekit = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY
});

module.exports = {
    imagekit,
    toFile
};
