import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import topercLogo from "../assets/toperc-logo.png";

export function SupportCard() {
  const { t } = useTranslation();

  return (
    <div className="support-card">
      <div className="support-section support-yt">
        <img src={topercLogo} alt="TopeRC" className="support-yt-logo" />
        <div className="support-yt-text">
          <span className="support-label">TopeRC</span>
          <span className="support-sub">{t("support.channelSub")}</span>
        </div>
        <a
          className="support-yt-btn"
          href="https://www.youtube.com/@TopeRC-es"
          target="_blank"
          rel="noreferrer"
        >
          {t("support.subscribe")}
        </a>
      </div>

      <div className="support-divider" />

      <div className="support-section support-donate">
        <div className="support-qr">
          <QRCode
            value="https://paypal.me/dgarana"
            size={96}
            bgColor="transparent"
            fgColor="#edf3f8"
            level="M"
          />
        </div>
        <div className="support-donate-text">
          <span className="support-label">{t("support.donateTitle")}</span>
          <span className="support-sub">{t("support.donateSub")}</span>
          <a
            className="support-donate-link"
            href="https://paypal.me/dgarana"
            target="_blank"
            rel="noreferrer"
          >
            paypal.me/dgarana
          </a>
        </div>
      </div>
    </div>
  );
}
