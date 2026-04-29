const fs = require('fs');
const path = require('path');

const feedScreenPath = path.join(__dirname, 'src/features/lawyer/screens/FeedScreen.tsx');
let content = fs.readFileSync(feedScreenPath, 'utf8');

// Replace the renderCase function entirely
const renderCaseStart = content.indexOf('const renderCase = ({ item }: { item: LegalCase }) => {');
const renderCaseEnd = content.indexOf('return (', renderCaseStart + 2000) > -1 ? content.indexOf('  return (\n    <View style={styles.container}>') : content.indexOf('return (\n    <View style={styles.container}>');

const newRenderCase = `  const renderCase = ({ item }: { item: LegalCase }) => {
    const hasBid = biddedCaseIds.has(item.id);
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.categoryBadge}>{item.category}</Text>
            <TouchableOpacity onPress={() => { setCaseToReport(item); setReportModalVisible(true); }} style={{ marginLeft: 8, padding: 4 }}>
              <Ionicons name="warning-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Avatar seed={item.clientId} size={30} style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.clientName}>Posted by: {item.clientName || 'Anonymous Client'}</Text>
            {dateStr ? <Text style={{ fontSize: 12, color: Colors.textSecondary }}>{dateStr}</Text> : null}
          </View>
        </View>
        <Text style={styles.description}>{item.description}</Text>
        
        <View style={styles.footerRow}>
          <Text style={styles.budget}>
            Budget: {item.budget ? formatCurrency(item.budget) : 'Negotiable'}
          </Text>
          <Button 
            title={hasBid ? "Bid Sent ✓" : "Submit Bid"} 
            onPress={() => openBidModal(item)}
            disabled={hasBid}
            style={[styles.bidButton, hasBid ? { backgroundColor: Colors.success } : {}]}
            textStyle={styles.bidButtonText}
          />
        </View>
      </Card>
    );
  };

`;

content = content.substring(0, renderCaseStart) + newRenderCase + content.substring(renderCaseEnd);

fs.writeFileSync(feedScreenPath, content);
console.log('Done Render Case');
