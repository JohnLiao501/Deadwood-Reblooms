export default function SmugglerPub(maplebirch: typeof window.maplebirch): void {
  maplebirch.tool.patch.location.configure(
    'deadwood_smuggler_pub',
    {
      folder: 'smuggler-pub',
      base: {
        default: { condition: () => !Weather.lightsOn, image: 'base.png' },
        night: { condition: () => Weather.lightsOn, image: 'base-night.png' }
      },
      // 洞内灯笼昼夜点着；两张底图和发光遮罩均为 32×32，坐标一致。
      emissive: { image: 'emissive.png', condition: () => true, color: '#e8b46b', size: 2, intensity: 0.45, blur: 0.3 },
      weather: { rainSplashEnabled: false, fogEnabled: false, fogDistributionCurve: 1, groundBounds: { splashes: { top: 0, bottom: 0 }, fog: { top: 0, bottom: 0 } } }
    },
    { overwrite: true }
  );
  // 只改变画面映射，保留地下地点标识、出口及通用洞穴图的注册。
  maplebirch.tool.patch.location.configure('underground', {
    customMapping: () => (maplebirch.get('StreetLife')!.smugglerPub.picture ? 'deadwood_smuggler_pub' : 'underground')
  });
  maplebirch.tool.inject({
    locationPassage: {
      'Smuggler Pub': [
        { src: '<<effects>>', applyafter: '\n<<deadwood-smuggler-pub-environment>>\n', expected: 1 },
        { src: '<<sewericon>>', applybefore: '<<deadwood-smuggler-pub-menu>>\n', expected: 1 }
      ]
    }
  });
}
