import escudoUCR from '../assets/escudoUCR.jpg';

export default function UcrLogo({ compact = false, height = 42 }) {
  return (
    <div className="d-flex align-items-center gap-2 text-decoration-none">
      <img
        src={escudoUCR}
        alt="Escudo UCR"
        className="img-fluid rounded"
        style={{
          height: `${height}px`,
          width: 'auto',
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
      <div className="d-flex flex-column text-start" style={{ lineHeight: 1.1 }}>
        <div className="d-flex align-items-center gap-1">
          <span
            className="fw-bolder tracking-tight"
            style={{ color: '#005691', fontSize: '1.05rem', letterSpacing: '-0.02em' }}
          >
            UCR
          </span>
          <span className="text-secondary opacity-50 fw-light">|</span>
          <span className="fw-bold text-dark" style={{ fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
            Raid<span style={{ color: '#0284c7' }}>U</span>
          </span>
        </div>
        {!compact && (
          <span
            className="text-secondary text-uppercase fw-semibold"
            style={{ fontSize: '0.62rem', letterSpacing: '0.06em' }}
          >
            Sede del Pacífico
          </span>
        )}
      </div>
    </div>
  );
}
