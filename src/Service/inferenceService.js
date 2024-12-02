const tf = require("@tensorflow/tfjs-node");
const InputError = require("../Exceptions/InputError");

async function predictClassification(model, image) {
  try {

    console.log("testing");
    

    const tensor = tf.node
      .decodeJpeg(image)
      .resizeNearestNeighbor([128, 128])
      .expandDims(0)
      .toFloat();

    console.log("testing2");
    

    const prediction = model.predict(tensor);
    console.log("classProbability");


    const classProbability = prediction.dataSync(); 

    console.log(classProbability);


    const highestProbabilityIndex = tf.argMax(classProbability).arraySync();
    const classes = ["battery", "biological", "brown-glass", "cardboard", "clothes", "green-glass", "metal","paper", "plastic", "shoes", "trash", "white-glass"];

    const label = classes[highestProbabilityIndex];
    console.log(`Prediksi kelas: ${label}`);

    let suggestion;
    if (label === "Cancer") {
      suggestion = "Segera periksa ke dokter!";
    } else if (label === "Non-cancer") {
      suggestion = "Penyakit kanker tidak terdeteksi.";
    }

    return { label};
    
  } catch (error) {
    throw new InputError(
      `Terjadi kesalahan saat memproses gambar: ${error.message}`
    );
  }
}

module.exports = predictClassification;
