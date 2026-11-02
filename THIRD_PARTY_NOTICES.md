# Third-party notices

Jarvis Notes (web) reimplements visual techniques from the two projects below in CSS. It bundles no third-party images. No third-party fonts are bundled. Two libraries/models are loaded at runtime and are listed at the end.

## SwiftUI-AquaButton

- Source: https://github.com/bobek-balinek/SwiftUI-AquaButton
- Version: commit 44bdc96e898c0eb2e3c5e31eafac55aad65c2b9b, file `SwiftUI-AquaButton/ContentView.swift` (`AquaGlassButton`)
- Used in: `css/styles.css` (`.aqua-button`), adapted to CSS via the Jarvis iOS app's `JarvisAquaCapsuleButtonStyle`
- Changes: opaque, darker gradient stops for label contrast; scalable text; reduced-motion and increased-contrast handling

```
MIT License

Copyright (c) 2025 Bobby Bobak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## skeuomorphic-audio-recorder

- Source: https://github.com/iainmck/skeuomorphic-audio-recorder
- Version: commit 2d03a189ad75895654e9ab42f5b01e7b7c991417, file `skeuomorphic-audio-recorder.swiftpm/ViewModifiers.swift` (`InsetShadow`, `glow(color:)`)
- Used in: `css/styles.css` (`.record-deck`, `.recorder`, `.led`, inset shadows), adapted to CSS
- Author per file header: Iain McKenzie. The upstream LICENSE.txt leaves the copyright line as the unfilled template shown below.
- Not used: the `noise-texture` image and the `ARCADE_R.TTF` font referenced by that file.

```
MIT License

Copyright (c) [year] [fullname]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Wallpaper

`assets/aero-water.svg` and `assets/aero-water-dark.svg` are original artwork drawn for this project (Nov 2, 2026). They replaced the earlier diinki-aero crop, whose source photographs had no stated rights. No third-party images are bundled.

## Loaded at runtime (not bundled)

- **Transformers.js** `@huggingface/transformers@4.3.2`, Apache License 2.0, loaded from jsDelivr by `js/whisper-worker.js`. https://github.com/huggingface/transformers.js
- **Whisper tiny.en (ONNX)** `onnx-community/whisper-tiny.en` at revision `2575352d61be1bf7225cf8f8b268a4678025fc58`, converted from `openai/whisper-tiny.en` (Apache License 2.0 on Hugging Face). Downloaded from Hugging Face on first use and cached by the browser.

Icons are original SVG drawings made for this site.
