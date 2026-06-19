import { useNavigate } from "react-router";
import "../css/App.css";

function NotFound() {
  const nav = useNavigate();

  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <h1 className="notfound-title">404</h1>
        <p className="notfound-note-text">
          ดูเหมือนว่าหน้านี้หลบหนีเข้าป่าไปแล้ว...
          <br />
          ลองกลับไปจับมันใหม่ที่หน้าแรกดูสิ
        </p>

        <button className="pokeball-button" onClick={() => nav("/")}>
          <span className="pokeball-button__ball">
            <span className="pokeball-button__center" />
          </span>
          <span className="pokeball-button__label">กลับไปหน้าแรก</span>
        </button>
      </div>
    </div>
  );
}

export default NotFound;