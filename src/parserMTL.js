export function parseMTL(text) {
  const materials = {};
  let currentMaterial = null;

  const lines = text.split("\n");

  for (let rawLine of lines) {
    let line = rawLine.trim();

    // Skip empty lines or comments
    if (!line || line.startsWith("#")) continue;

    line = line.split("#")[0].trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    const keyword = parts[0];
    const value = parts.slice(1);


    if (keyword === "newmtl") {
      currentMaterial = {};
      materials[value[0]] = currentMaterial;
      continue;
    }

    // Validate if material is present
    if (!currentMaterial) {
      console.warn("MTL: property before newmtl →", line);
      continue;
    }

    switch (keyword) {
      case "Ka":
        currentMaterial.ambient = value.map(Number);
        break;
      case "Kd":
        currentMaterial.diffuse = value.map(Number);
        break;
      case "Ks":
        currentMaterial.specular = value.map(Number);
        break;

      case "map_Kd":
      case "map_Ks":
      case "map_Bump":
      case "bump":
        currentMaterial[keyword] = parseTextureArgs(value);
        break;

      case "Ns":
      case "d":
        currentMaterial[keyword] = Number(value[0]);
        break;
      case "illum":
        currentMaterial[keyword] = Number(value[0]);
        break;

      default:
        currentMaterial[keyword] = value.join(" ");
        break;
    }
  }

  return materials;
}

function parseTextureArgs(values) {
  const result = {
    url: null,
    scale: null,
    offset: null
  };

  for (let i = 0; i < values.length; i++) {
    if (values[i] === "-s") {
      result.scale = values.slice(i + 1, i + 4).map(Number);
      i += 3;
    } else if (values[i] === "-o") {
      result.offset = values.slice(i + 1, i + 3).map(Number);
      i += 2;
    } else {
      result.url = values[i];
    }
  }

  return result;
}