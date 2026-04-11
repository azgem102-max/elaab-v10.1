const PRIMARY = "#2C54E8";
const ACCENT = "#06B6D4";
const BG = "#F0FBFF";
const CARD_BG = "#FFFFFF";
const TEXT_PRIMARY = "#0F172A";
const TEXT_SECONDARY = "#64748B";

const quickActions = [
  { icon: "⚽", label: "مبارياتي" },
  { icon: "👥", label: "مجموعاتي" },
  { icon: "📊", label: "إحصائيات" },
  { icon: "🏆", label: "بطولات" },
];

const groupActivity = [
  { name: "الهلال FC", update: "مباراة غداً الساعة 6م", avatar: "🔵" },
  { name: "فريق العمل", update: "انضم 3 لاعبين جدد", avatar: "🟢" },
  { name: "دوري الأصدقاء", update: "النتيجة النهائية 3-1", avatar: "🔴" },
];

export default function Option3Cyan() {
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
      <div
        style={{
          background: `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
          padding: "52px 20px 24px",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 2 }}>مرحباً،</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>أحمد الغامدي 👋</div>
          </div>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            🔔
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.18)",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ opacity: 0.7 }}>🔍</span>
          <span style={{ fontSize: 14, opacity: 0.7 }}>ابحث عن لاعبين أو مجموعات...</span>
        </div>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 14 }}>
          إجراءات سريعة
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {quickActions.map((action) => (
            <div
              key={action.label}
              style={{
                background: CARD_BG,
                borderRadius: 14,
                padding: "14px 8px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(6,182,212,0.10)",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{action.icon}</div>
              <div style={{ fontSize: 11, color: TEXT_SECONDARY, fontWeight: 600 }}>{action.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 14 }}>
          مبارتك القادمة
        </div>
        <div
          style={{
            background: CARD_BG,
            borderRadius: 18,
            padding: 18,
            boxShadow: "0 4px 16px rgba(6,182,212,0.12)",
            border: `1.5px solid ${ACCENT}33`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div
              style={{
                background: `${ACCENT}18`,
                color: ACCENT,
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 8,
                padding: "4px 10px",
              }}
            >
              الجمعة 10 أبريل
            </div>
            <div style={{ fontSize: 11, color: TEXT_SECONDARY }}>6:00 م</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", marginBottom: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 4 }}>🔵</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY }}>الهلال</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  background: `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 800,
                  borderRadius: 12,
                  padding: "8px 16px",
                }}
              >
                VS
              </div>
              <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 4 }}>ملعب الأمير فيصل</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 4 }}>🟢</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY }}>الأهلي</div>
            </div>
          </div>

          <div
            style={{
              background: `linear-gradient(90deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
              color: "#fff",
              borderRadius: 12,
              padding: "12px",
              textAlign: "center",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            عرض التفاصيل
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_PRIMARY }}>نشاط مجموعاتي</div>
          <div style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>عرض الكل</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groupActivity.map((group) => (
            <div
              key={group.name}
              style={{
                background: CARD_BG,
                borderRadius: 14,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 2px 8px rgba(6,182,212,0.08)",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: `${ACCENT}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {group.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY }}>{group.name}</div>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>{group.update}</div>
              </div>
              <div style={{ color: TEXT_SECONDARY, fontSize: 16 }}>›</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 28,
          borderTop: "1px solid #E0F7FA",
          padding: "14px 0 8px",
          display: "flex",
          justifyContent: "space-around",
        }}
      >
        {[
          { icon: "🏠", label: "الرئيسية", active: true },
          { icon: "⚽", label: "مباريات", active: false },
          { icon: "👥", label: "مجموعات", active: false },
          { icon: "👤", label: "ملفي", active: false },
        ].map((tab) => (
          <div key={tab.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>{tab.icon}</div>
            <div
              style={{
                fontSize: 10,
                marginTop: 2,
                color: tab.active ? PRIMARY : TEXT_SECONDARY,
                fontWeight: tab.active ? 700 : 400,
              }}
            >
              {tab.label}
            </div>
            {tab.active && (
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: ACCENT,
                  margin: "2px auto 0",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
