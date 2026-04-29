const fs = require('fs');
const path = require('path');

const feedScreenPath = path.join(__dirname, 'src/features/lawyer/screens/FeedScreen.tsx');
let content = fs.readFileSync(feedScreenPath, 'utf8');

// Inject the Report Modal at the bottom
const modalRegex = /(<Modal visible=\{isModalVisible\}.*?<\/Modal>)/s;
const reportModalHtml = `
      {/* Report Modal */}
      <Modal visible={isReportModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Case</Text>
            <Text style={styles.modalSub}>Why are you reporting this?</Text>
            <Input
              label="Reason for reporting"
              placeholder="Spam, inappropriate, etc..."
              value={reportReason}
              onChangeText={setReportReason}
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" onPress={() => { setReportModalVisible(false); setReportReason(''); setCaseToReport(null); }} style={{ flex: 1, marginRight: 8 }} />
              <Button title="Submit Report" variant="primary" onPress={handleReportCase} isLoading={isSubmitting} style={{ flex: 1, marginLeft: 8, backgroundColor: Colors.error, borderColor: Colors.error }} />
            </View>
          </View>
        </View>
      </Modal>
`;

if (!content.includes('isReportModalVisible')) {
    // Should be injected already by the earlier powershell replace we did, but let's check.
}

content = content.replace(modalRegex, `$1\n${reportModalHtml}`);

// Fix the corrupted file if it is corrupted
fs.writeFileSync(feedScreenPath, content);
console.log('Done');
