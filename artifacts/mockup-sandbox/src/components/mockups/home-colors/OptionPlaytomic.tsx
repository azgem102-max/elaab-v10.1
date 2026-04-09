const PRIMARY = "#2563EB";
const LIME = "#C8FF00";
const BG = "#F5F5F5";
const CARD_BG = "#FFFFFF";
const TEXT_PRIMARY = "#0A0A0A";
const TEXT_SECONDARY = "#6B7280";

const quickActions = [
  { icon: "⚽", label: "إيجاد مباراة" },
  { icon: "🏆", label: "تنافس" },
  { icon: "👥", label: "مجتمع" },
  { icon: "🏟️", label: "احجز ملعب" },
];

const suggestedGroups = [
  { name: "الهلال FC", detail: "4 مباريات مفتوحة", image: "🟦" },
  { name: "النصر FC", detail: "2 مباريات مفتوحة", image: "🟨" },
];

export default function OptionPlaytomic() {
  return (
    <div
      style={{
        width: 390,
        minHeight: 844,
        backgroundColor: BG,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        direction: "rtl",
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: PRIMARY,
          padding: "52px 20px 20px",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1, color: "#fff" }}>
          العَب
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            🔔
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            ☰
          </div>
        </div>
      </div>

      {/* Reminder Banner */}
      <div style={{ padding: "14px 16px 0" }}>
        <div
          style={{
            background: CARD_BG,
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginBottom: 2, fontWeight: 600 }}>لا تنسَ!</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>أكمل ملفك الرياضي</div>
            <div style={{ fontSize: 12, color: TEXT_SECONDARY }}>مستوى اللعب، المركز، نوع المباراة...</div>
          </div>
          <div style={{ fontSize: 22 }}>⚙️</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {quickActions.map((action) => (
            <div
              key={action.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: LIME,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  boxShadow: "0 2px 8px rgba(200,255,0,0.3)",
                }}
              >
                {action.icon}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: TEXT_PRIMARY,
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                {action.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Groups */}
      <div style={{ padding: "24px 16px 0" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: TEXT_PRIMARY }}>
            مجموعات مقترحة لك
          </div>
          <div style={{ fontSize: 13, color: PRIMARY, fontWeight: 700 }}>عرض الكل</div>
        </div>

        <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
          {/* Card with image */}
          <div
            style={{
              width: 220,
              borderRadius: 16,
              overflow: "hidden",
              background: PRIMARY,
              flexShrink: 0,
              boxShadow: "0 4px 14px rgba(37,99,235,0.25)",
            }}
          >
            <div
              style={{
                height: 110,
                background: `linear-gradient(160deg, #1d4ed8 0%, #3b82f6 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 50,
              }}
            >
              ⚽
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 2 }}>
                الهلال FC
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                الرياض • 1250 كم
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 10,
                  borderTop: "1px solid rgba(255,255,255,0.15)",
                  paddingTop: 10,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>0</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>بطولات</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: LIME }}>10+</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>مباريات</div>
                </div>
              </div>
            </div>
          </div>

          {/* Location card */}
          <div
            style={{
              width: 160,
              borderRadius: 16,
              background: CARD_BG,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              textAlign: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 28 }}>📍</div>
            <div style={{ fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.5 }}>
              فعّل الموقع للحصول على توصيات أفضل
            </div>
            <div
              style={{
                background: PRIMARY,
                color: "#fff",
                borderRadius: 20,
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              تفعيل
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Match */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: TEXT_PRIMARY, marginBottom: 14 }}>
          مبارتك القادمة
        </div>
        <div
          style={{
            background: CARD_BG,
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                background: `${LIME}`,
                color: TEXT_PRIMARY,
                fontSize: 11,
                fontWeight: 800,
                borderRadius: 8,
                padding: "4px 10px",
              }}
            >
              الجمعة 10 أبريل
            </div>
            <div style={{ fontSize: 11, color: TEXT_SECONDARY }}>6:00 م</div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>🔵</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>الهلال</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  background: PRIMARY,
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 900,
                  borderRadius: 10,
                  padding: "8px 14px",
                }}
              >
                VS
              </div>
              <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 4 }}>
                ملعب الأمير فيصل
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>🟢</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>الأهلي</div>
            </div>
          </div>
          <div
            style={{
              background: LIME,
              color: TEXT_PRIMARY,
              borderRadius: 12,
              padding: "12px",
              textAlign: "center",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            عرض التفاصيل
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div
        style={{
          marginTop: 28,
          borderTop: "1px solid #E5E7EB",
          padding: "12px 0 8px",
          display: "flex",
          justifyContent: "space-around",
          background: CARD_BG,
        }}
      >
        {[
          { icon: "👤", label: "ملفي", active: false },
          { icon: "👥", label: "مجتمع", active: false },
          { icon: "🏠", label: "الرئيسية", active: true },
        ].map((tab) => (
          <div key={tab.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>{tab.icon}</div>
            <div
              style={{
                fontSize: 11,
                marginTop: 2,
                color: tab.active ? PRIMARY : TEXT_SECONDARY,
                fontWeight: tab.active ? 800 : 400,
              }}
            >
              {tab.label}
            </div>
            {tab.active && (
              <div
                style={{
                  width: 20,
                  height: 3,
                  borderRadius: 2,
                  background: PRIMARY,
                  margin: "3px auto 0",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
