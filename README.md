# Parsing and Applying Textures from .mtl file on WebGL Cube

This project is a small WebGL application that demonstrates loading and applying textures to a 3D cube using a .mtl file and UV mapping. It includes a simple UI to switch between Single, Multi, and UV Debug modes.

 **Live Demo:** [**Link**](https://kathrina-dev.github.io/mtl-parser/)

<img width="1911" height="919" alt="image" src="https://github.com/user-attachments/assets/838e9311-d522-4901-b33a-67c775518ac1" />

---

## Features

- Render a 3D cube with WebGL
- Apply a single texture to the entire cube
- Apply different textures to each cube face
- Visualize UV mapping using a UV grid
- Parse `.mtl` files to extract material textures
- Async texture loading with fallback
- Basic vertex and fragment shaders
- Interactive mode switching via keyboard

---

## Core Concepts Explored

1. ### `.MTL` File Syntax
   - Defines material properties for 3D objects.  
   - `map_Kd` specifies diffuse texture paths.  
   - Supports multiple materials per object for flexibility in rendering.
  
2. ### Parsing MTL Files
   - Programmatically extract material and texture information.  
   - Automates applying textures without manual assignment.  
   - Supports scalable workflows for more complex models.
  
3. ### Multi-Face Textures
   - Different textures can be applied to individual cube faces.  
   - Rendering subsets of indices allows per-face control.  
   - Enhances visual variety and realism in simple 3D models.

4. ### Asynchronous Texture Loading
   - Textures load in the background to prevent blocking the render loop.  
   - Fallback textures ensure the scene renders even if some images aren’t loaded.  
   - Supports multiple simultaneous texture downloads efficiently.

5. ### UV Mapping
   - Maps 2D textures onto 3D surfaces.  
   - UV grid textures help verify correct alignment of textures.  
   - Essential for debugging and precision in texture placement.

6. ### Cube Vertices
   - 24 vertices (4 per face) allow independent UV mapping for each face.  
   - Ensures textures align correctly without distortion.  
   - Separating vertices per face is crucial for multi-textured objects.

7. ### Shaders
   - **Vertex Shader**: Transforms 3D vertices to screen space.  
   - **Fragment Shader**: Maps textures onto pixels of geometry.  
   - Core to controlling appearance and rendering in WebGL.
  
8. ### WebGL & Canvas
   - Setup a WebGL context on an HTML `<canvas>` element.  
   - Configure buffers, attributes, and element drawing.  
   - Handle viewport resizing and depth testing for 3D rendering.

9. ### Camera and Projection
   - Camera position and view matrix determine how the scene is observed.  
   - Projection matrix controls zoom and perspective.  
   - Model, view, and projection matrices combine to place objects correctly in 3D space.

---

## /mtl-parser

├─ .github/workflows/deploy.yml # Github Pages deployment workflow

├─ assets/images # Textures for the cube

├─ src/parserMTL.js # MTL file parser

├─ index.html # HTML canvas and UI

├─ main.js # WebGL setup, rendering, textures

├─ example.mtl # Material file

└─ README.md # Project documentation

---

## Screenshots

- **Single Texture Mode**  
<img width="1913" height="915" alt="image" src="https://github.com/user-attachments/assets/a84ffe61-a753-4a57-97df-e7da7eb66a83" />


- **Multi-Face Texture Mode**  
<img width="1911" height="919" alt="image" src="https://github.com/user-attachments/assets/838e9311-d522-4901-b33a-67c775518ac1" />


- **UV Debug Mode**  
<img width="1908" height="908" alt="image" src="https://github.com/user-attachments/assets/06c2f263-f517-4fb6-8559-6e63faea6f35" />

