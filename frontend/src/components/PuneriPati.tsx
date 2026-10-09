import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'

/** Puneri Patya: Pune's famously blunt signboards. Original lines written in that style, each wired to a real feature. */
export const PATYA: { lead: string; rest: string; en: string; hi: string; to: string }[] = [
  { lead: 'खड्डा दिसला तर कळवावा.', rest: 'नुसतं बोलून उपयोग नाही.', en: 'Seen a pothole? Report it. Just complaining won\'t fix it.', hi: 'गड्ढा दिखे तो रिपोर्ट करें। सिर्फ़ बोलने से कुछ नहीं होगा।', to: '/report' },
  { lead: 'रात्री उशिरा जलद मार्ग नको.', rest: 'शहाणा मार्ग निवडावा.', en: 'Late at night, skip the fast route. Pick the wise one.', hi: 'देर रात तेज़ नहीं, समझदार रास्ता चुनें।', to: '/safety' },
  { lead: 'मिसळ तिखट असते.', rest: 'नंतर तक्रार करू नये.', en: 'Misal is spicy. Complaints later will not be entertained.', hi: 'मिसळ तीखी होती है। बाद में शिकायत न करें।', to: '/explore?q=misal' },
  { lead: 'अफवा पसरवू नयेत.', rest: 'पुरावा द्यावा. विश्वास आपोआप वाढेल.', en: 'Do not spread rumours. Bring evidence; trust will follow.', hi: 'अफ़वाह न फैलाएं। सबूत दें, भरोसा अपने-आप बढ़ेगा।', to: '/safety' },
  { lead: 'पत्ता विचारण्याआधी नकाशा पाहावा.', rest: 'नकाशा याच ॲपमध्ये आहे.', en: 'Check the map before asking for directions. The map is right here.', hi: 'रास्ता पूछने से पहले नक्शा देखें। नक्शा इसी ऐप में है।', to: '/city' },
  { lead: 'उत्तम आणि वाईट ठरवायचं?', rest: 'आधी तुलना करावी. मग बोलावे.', en: 'Want to judge best vs worst? Compare first, then talk.', hi: 'अच्छा-बुरा तय करना है? पहले तुलना करें, फिर बोलें।', to: '/compare' },
]

export function PuneriPati({ i, tilt = 0, link = true }: { i: number; tilt?: number; link?: boolean }) {
  const { lang } = useI18n()
  const p = PATYA[i % PATYA.length]
  const body = (
    <>
      <span className="pati-lead" lang="mr">{p.lead}</span>
      <span className="pati-rest" lang="mr">{p.rest}</span>
      <span className="pati-sign" lang="mr">— हुकुमावरून, व्यवस्थापन</span>
      {lang !== 'mr' && <span className="pati-gloss">{lang === 'hi' ? p.hi : p.en}</span>}
    </>
  )
  const style = { ['--r' as string]: `${tilt}deg` }
  return link
    ? <Link to={p.to} className="pati" style={style}>{body}</Link>
    : <div className="pati" style={style}>{body}</div>
}
