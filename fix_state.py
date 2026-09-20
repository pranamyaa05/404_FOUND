import sys

with open('frontend/src/components/studio/MeshViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the state declarations
old_state = '''  const [garmentScaleMultiplier, setGarmentScaleMultiplier] = useState(1);
  const [garmentOffsetY, setGarmentOffsetY] = useState(0.0);

  const handleSimulateCloth = async () => {'''

new_state = '''  const [garmentScaleMultiplier, setGarmentScaleMultiplier] = useState(1);
  const [garmentOffsetX, setGarmentOffsetX] = useState(0.0);
  const [garmentOffsetY, setGarmentOffsetY] = useState(0.0);
  const [garmentOffsetZ, setGarmentOffsetZ] = useState(0.0);

  const handleSimulateCloth = async () => {'''

if old_state in content:
    content = content.replace(old_state, new_state)
    print('State replaced')
else:
    print('State not found - might already be there or mismatched')

# Fix Model props in the canvas
old_canvas1 = '''<Model url={meshUrl} manualScale={garmentScaleMultiplier} manualOffsetY={garmentOffsetY} />'''
new_canvas1 = '''<Model url={meshUrl} manualScale={garmentScaleMultiplier} manualOffsetX={garmentOffsetX} manualOffsetY={garmentOffsetY} manualOffsetZ={garmentOffsetZ} />'''

old_canvas2 = '''<Model url={drapedUrl} isDraped={true} manualScale={garmentScaleMultiplier} manualOffsetY={garmentOffsetY} />'''
new_canvas2 = '''<Model url={drapedUrl} isDraped={true} manualScale={garmentScaleMultiplier} manualOffsetX={garmentOffsetX} manualOffsetY={garmentOffsetY} manualOffsetZ={garmentOffsetZ} />'''

content = content.replace(old_canvas1, new_canvas1)
content = content.replace(old_canvas2, new_canvas2)

with open('frontend/src/components/studio/MeshViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done updating MeshViewer state and Model props')