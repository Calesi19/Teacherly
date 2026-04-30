import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { APP_NAME } from "../appConfig";
import { translations } from "../i18n/translations";
import type { Language } from "../i18n/translations";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a202c",
    paddingTop: 72,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },
  header: {
    position: "absolute",
    top: 24,
    left: 48,
    right: 48,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "column",
    gap: 2,
  },
  headerTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: "#1a202c",
  },
  headerSub: {
    fontSize: 9,
    color: "#718096",
  },
  headerApp: {
    fontSize: 8,
    color: "#a0aec0",
    fontFamily: "Helvetica-Oblique",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 48,
    right: 48,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#a0aec0",
  },
  content: {
    flex: 1,
  },
});

interface PdfDocumentProps {
  title: string;
  groupName: string;
  schoolName?: string | null;
  generatedDate: string;
  language: Language;
  children: ReactNode;
}

export function PdfDocument({
  title,
  groupName,
  schoolName,
  generatedDate,
  language,
  children,
}: PdfDocumentProps) {
  const L = translations[language].reports.pdf;
  const subtitle = [schoolName, groupName].filter(Boolean).join(" · ");

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{title}</Text>
            {subtitle ? (
              <Text style={styles.headerSub}>{subtitle}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.content}>{children}</View>

        <View style={styles.footer} fixed>
          <Text>{L.generatedOn.replace("{date}", generatedDate)}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              L.pageOf
                .replace("{page}", String(pageNumber))
                .replace("{total}", String(totalPages))
            }
          />
        </View>
      </Page>
    </Document>
  );
}
