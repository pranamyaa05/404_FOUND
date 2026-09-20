import sys

with open('frontend/src/components/studio/MeshViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_jsx = '''            <div>
              <label className="block text-xs text-surface-dark/70 mb-1">Vertical Offset ({garmentOffsetY.toFixed(2)})</label>
              <input
                type="range"
                min="-1.5"
                max="1.5"
                step="0.01"
                value={garmentOffsetY}
                onChange={(e) => setGarmentOffsetY(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>'''

new_jsx = '''            <div>
              <label className="block text-xs text-surface-dark/70 mb-1">Vertical Offset ({garmentOffsetY.toFixed(2)})</label>
              <input type="range" min="-1.5" max="1.5" step="0.01" value={garmentOffsetY} onChange={(e) => setGarmentOffsetY(parseFloat(e.target.value))} className="w-full accent-primary" />
            </div>
            <div>
              <label className="block text-xs text-surface-dark/70 mb-1">Horiz Offset X ({garmentOffsetX.toFixed(2)})</label>
              <input type="range" min="-1.5" max="1.5" step="0.01" value={garmentOffsetX} onChange={(e) => setGarmentOffsetX(parseFloat(e.target.value))} className="w-full accent-primary" />
            </div>
            <div>
              <label className="block text-xs text-surface-dark/70 mb-1">Depth Offset Z ({garmentOffsetZ.toFixed(2)})</label>
              <input type="range" min="-1.5" max="1.5" step="0.01" value={garmentOffsetZ} onChange={(e) => setGarmentOffsetZ(parseFloat(e.target.value))} className="w-full accent-primary" />
            </div>
          </div>'''

if old_jsx in content:
    with open('frontend/src/components/studio/MeshViewer.tsx', 'w', encoding='utf-8') as f:
        f.write(content.replace(old_jsx, new_jsx))
    print('Updated UI successfully')
else:
    print('JSX not found')