import { View, Text } from 'react-native';
import Svg, { Path, Polyline, Defs, LinearGradient, Stop } from 'react-native-svg';
import { GREEN } from '../constants';

export default function LatencyChart({ data, width, height = 60 }) {
  const H = height;
  const PX = 4, PY = 6;
  const W = width - PX * 2;

  if (!data || data.length < 2) {
    return (
      <View style={{ height: H, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#2a2a2a', fontSize: 11 }}>Waiting for data…</Text>
      </View>
    );
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: PX + (i / (data.length - 1)) * W,
    y: PY + (1 - (v - min) / range) * (H - PY * 2),
  }));

  const linePoints = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath =
    `M ${pts[0].x},${H} ` +
    pts.map(p => `L ${p.x},${p.y}`).join(' ') +
    ` L ${pts[pts.length - 1].x},${H} Z`;

  return (
    <Svg width={width} height={H}>
      <Defs>
        <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={GREEN} stopOpacity="0.25" />
          <Stop offset="1" stopColor={GREEN} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#areaGradient)" />
      <Polyline
        points={linePoints}
        fill="none"
        stroke={GREEN}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
