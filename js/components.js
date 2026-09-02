/**
 * CityAssist - UI Component Renderers & Modal Templates
 */

const UIComponents = {
  getServiceIcon(type) {
    switch (type) {
      case 'water':
        return `
          <div class="service-icon-box water-icon">
            <svg viewBox="0 0 24 24" fill="#1E88E5">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
          </div>`;
      case 'electric':
        return `
          <div class="service-icon-box electric-icon">
            <svg viewBox="0 0 24 24" fill="#F59E0B">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>`;
      case 'ac':
        return `
          <div class="service-icon-box ac-icon">
            <svg viewBox="0 0 24 24" fill="#0284C7">
              <path d="M12 2v20M17 5H7M19 9H5M21 13H3M19 17H5M17 21H7"/>
            </svg>
          </div>`;
      default:
        return `
          <div class="service-icon-box waste-icon">
            <svg viewBox="0 0 24 24" fill="#16A34A">
              <path d="M3 6h18v2H3V6zm2 3h14v13H5V9zm3-7h8v2H8V2z"/>
            </svg>
          </div>`;
    }
  },

  renderRequestCard(req) {
    const isAssigned = req.assignedTo && req.assignedTo.name;
    const badgeClass = req.status === 'on_the_way' ? 'on-the-way' : (req.status === 'completed' ? 'completed' : (req.status === 'in_progress' ? 'in-progress' : 'canceled'));
    
    return `
      <div class="request-card" data-req-id="${req.id}">
        <div class="req-header-row">
          <span class="req-id">${req.id}</span>
          <span class="status-badge ${badgeClass}">${req.statusLabel}</span>
        </div>

        <div class="req-service-info">
          ${this.getServiceIcon(req.iconType)}
          <span class="service-name">${req.title}</span>
        </div>

        ${isAssigned ? `
          <div class="req-assigned-row">
            <img src="${req.assignedTo.avatar}" alt="${req.assignedTo.name}" class="assigned-avatar">
            <div class="assigned-details">
              <span class="assigned-label">Assigned to</span>
              <span class="assigned-name">${req.assignedTo.name}</span>
            </div>
          </div>
        ` : ''}

        <div class="req-timeline-status">
          <div class="timeline-bullet-icon ${req.timeline.iconType === 'gear' ? 'green-gear' : 'green-check'}">
            ${req.timeline.iconType === 'gear' ? `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            ` : `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            `}
          </div>
          <div class="timeline-step-text">${req.timeline.step}</div>
          <div class="timeline-sub-text">${req.timeline.detail}</div>
        </div>

        <button class="view-details-btn" onclick="CityAssist.showRequestDetails('${req.id}')">
          View Details
        </button>
      </div>
    `;
  },

  renderRequestDetailsModal(req) {
    return `
      <div class="modal-header-block">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h3 style="font-size:1.25rem; font-weight:800;">${req.id} Details</h3>
          <span class="status-badge on-the-way">${req.statusLabel}</span>
        </div>
        <h4 style="font-size:1.05rem; font-weight:700; color:#1F2937; margin-bottom:12px;">${req.title}</h4>
      </div>

      <div style="background:#F8FAFC; border-radius:12px; padding:14px; margin-bottom:16px; font-size:0.9rem;">
        <div style="margin-bottom:8px;"><strong>Service Address:</strong><br><span style="color:#4B5563;">${req.address}</span></div>
        <div style="margin-bottom:8px;"><strong>Requested Time:</strong><br><span style="color:#4B5563;">${req.date}</span></div>
        ${req.assignedTo ? `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:10px; border-top:1px solid #E2E8F0;">
            <div>
              <strong>${req.assignedTo.name}</strong>
              <div style="color:#64748B; font-size:0.8rem;">Direct Contact: ${req.assignedTo.phone}</div>
            </div>
            <a href="tel:${req.assignedTo.phone}" style="background:#0F7943; color:#fff; text-decoration:none; padding:8px 14px; border-radius:8px; font-weight:700; font-size:0.85rem;">📞 Call</a>
          </div>
        ` : ''}
      </div>

      <div style="display:flex; gap:10px;">
        <button class="primary-green-btn" onclick="CityAssist.closeModal()" style="flex:1;">Done</button>
        <button onclick="CityAssist.cancelRequest('${req.id}')" style="background:#FEE2E2; color:#DC2626; border:none; padding:12px 16px; border-radius:10px; font-weight:700; cursor:pointer;">Cancel</button>
      </div>
    `;
  },

  renderEmergencyDispatchModal(type) {
    const icons = {
      'Water Leakage': '💧',
      'Electrical Issue': '⚡',
      'Gas Leak (Suspected)': '🔥',
      'Other Urgent Repair': '🔧'
    };
    const icon = icons[type] || '🚨';

    return `
      <div style="text-align:center; padding:10px 0 16px;">
        <!-- Glowing Siren Beacon with Concentric Radar Waves -->
        <div style="position:relative; width:80px; height:80px; margin:0 auto 16px;">
          <span class="leaflet-radar-ring red" style="position:absolute; width:100%; height:100%; border-radius:50%; border:2.5px solid #EF4444; animation:sosPulseRing 1.4s infinite;"></span>
          <div style="width:80px; height:80px; background:linear-gradient(135deg, #DC2626, #EF4444); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2.4rem; box-shadow:0 8px 24px rgba(220, 38, 38, 0.45); color:#FFF;">
            ${icon}
          </div>
        </div>

        <div style="display:inline-flex; align-items:center; gap:6px; background:#FEE2E2; color:#991B1B; padding:4px 12px; border-radius:20px; font-weight:800; font-size:0.78rem; margin-bottom:8px;">
          <span style="width:8px; height:8px; border-radius:50%; background:#DC2626; display:inline-block; animation:pulse-ring 1s infinite;"></span>
          HIGH-PRIORITY SOS DISPATCH
        </div>

        <h3 style="font-size:1.38rem; font-weight:900; color:#0F172A; margin:0 0 6px; letter-spacing:-0.3px;">
          Rapid Response Dispatched!
        </h3>
        <p style="font-size:0.85rem; color:#64748B; line-height:1.4; margin:0 0 16px; padding:0 8px;">
          Emergency assistance triggered for <strong>${type}</strong> at <strong style="color:#1E293B;">Samta Colony, Talegaon Dabhade</strong>.
        </p>

        <!-- Officer & Patrol Assignment Card -->
        <div style="background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:16px; padding:14px; text-align:left; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:42px; height:42px; border-radius:12px; background:#DCFCE7; color:#15803D; display:flex; align-items:center; justify-content:center; font-size:1.4rem;">
                👮
              </div>
              <div>
                <strong style="font-size:0.92rem; color:#0F172A; display:block;">Patrol Squad #4 (Talegaon Central)</strong>
                <span style="font-size:0.75rem; color:#16A34A; font-weight:700;">● Active En Route • ETA ~4-6 mins</span>
              </div>
            </div>
            <button type="button" onclick="CityAssist.showToast('📞 Dialing Patrol Officer Narendra P. (+91 98220 11999)...')" style="background:#16A34A; color:#FFF; border:none; padding:8px 12px; border-radius:10px; font-weight:800; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; gap:4px;">
              📞 Call Officer
            </button>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.76rem; border-top:1px dashed #CBD5E1; padding-top:10px;">
            <div>
              <span style="color:#64748B; display:block;">GPS Telemetry:</span>
              <strong style="color:#334155;">18.7285°N, 73.6765°E</strong>
            </div>
            <div>
              <span style="color:#64748B; display:block;">Toll-Free Control Room:</span>
              <strong style="color:#1D4ED8;">1800 233 4567</strong>
            </div>
          </div>
        </div>

        <!-- Quick Helplines Row -->
        <div style="display:flex; justify-content:center; gap:8px; margin-bottom:18px;">
          <button type="button" onclick="CityAssist.showToast('Calling Police (112)...')" style="background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; padding:6px 12px; border-radius:8px; font-size:0.75rem; font-weight:800; cursor:pointer;">
            🚓 Police 112
          </button>
          <button type="button" onclick="CityAssist.showToast('Calling Fire & Rescue (101)...')" style="background:#FEF2F2; color:#DC2626; border:1px solid #FECACA; padding:6px 12px; border-radius:8px; font-size:0.75rem; font-weight:800; cursor:pointer;">
            🚒 Fire 101
          </button>
          <button type="button" onclick="CityAssist.showToast('Calling Ambulance (108)...')" style="background:#F0FDF4; color:#15803D; border:1px solid #BBF7D0; padding:6px 12px; border-radius:8px; font-size:0.75rem; font-weight:800; cursor:pointer;">
            🚑 Medical 108
          </button>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; gap:10px;">
          <button class="primary-green-btn" onclick="CityAssist.closeModal(); CityAssist.navigateTo('my-requests');" style="flex:1; padding:14px; font-weight:800; font-size:0.95rem; border-radius:14px;">
            📋 Track Emergency Ticket
          </button>
          <button type="button" onclick="CityAssist.closeModal();" style="background:#F1F5F9; color:#475569; border:none; padding:14px 18px; border-radius:14px; font-weight:800; font-size:0.9rem; cursor:pointer;">
            Dismiss
          </button>
        </div>
      </div>
    `;
  },

  renderRewardsModal() {
    return `
      <div class="modal-header-block">
        <h3 style="font-size:1.3rem; font-weight:800; margin-bottom:4px;">🌟 My Points & Rewards</h3>
        <p style="color:#64748B; font-size:0.88rem; margin-bottom:16px;">Earn points by disposing waste responsibly and reporting civic issues.</p>
      </div>

      <div style="background:linear-gradient(135deg, #0F7943, #16A34A); border-radius:16px; padding:20px; color:#fff; text-align:center; margin-bottom:16px; box-shadow:0 8px 20px rgba(15, 121, 67, 0.25);">
        <div style="font-size:0.85rem; opacity:0.9;">Available Balance</div>
        <div style="font-size:2.4rem; font-weight:800; margin:4px 0;">1,240 pts</div>
        <div style="font-size:0.8rem; background:rgba(255,255,255,0.2); display:inline-block; padding:4px 12px; border-radius:20px;">Redeemable for ₹124 discount on utility bills</div>
      </div>

      <!-- Social Shareable Civic Eco-Card CTA -->
      <button type="button" onclick="CityAssist.showCivicEcoCardModal()" style="width:100%; background:linear-gradient(135deg, #065F46, #047857); color:#FFF; border:1.5px solid #34D399; padding:12px; border-radius:14px; font-weight:800; font-size:0.9rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:18px; box-shadow:0 6px 16px rgba(4,120,87,0.25);">
        <span>🎖️ Generate & Share Civic Eco-Card</span>
        <span style="background:rgba(255,255,255,0.2); font-size:0.75rem; padding:2px 8px; border-radius:10px;">WhatsApp</span>
      </button>

      <h4 style="font-size:1rem; font-weight:700; margin-bottom:12px;">Redeem Offers</h4>
      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#F8FAFC; padding:12px 14px; border-radius:12px; border:1px solid #E2E8F0;">
          <div>
            <div style="font-weight:700; font-size:0.95rem;">₹50 Municipal Tax Voucher</div>
            <div style="font-size:0.8rem; color:#64748B;">Requires 500 points</div>
          </div>
          <button onclick="CityAssist.showToast('Voucher redeemed successfully!'); CityAssist.closeModal();" style="background:#0F7943; color:#fff; border:none; padding:6px 14px; border-radius:8px; font-weight:700; cursor:pointer;">Redeem</button>
        </div>
      </div>

      <button class="primary-green-btn" onclick="CityAssist.closeModal()">Close</button>
    `;
  },

  renderCivicEcoCardModal() {
    return `
      <div style="text-align:center; padding:6px 0 14px;">
        <!-- Holographic Civic Eco-Card Certificate -->
        <div class="civic-card-certificate" id="civic-eco-certificate">
          <div class="civic-card-hologram"></div>
          
          <div class="civic-card-header">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:48px; height:48px; border-radius:50%; border:2px solid #FDE047; overflow:hidden; background:#FFF; box-shadow:0 4px 10px rgba(0,0,0,0.3);">
                <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80" style="width:100%; height:100%; object-fit:cover;">
              </div>
              <div style="text-align:left;">
                <div style="font-size:1.1rem; font-weight:900; color:#FFFFFF; line-height:1.2;">Siddhant Ramteke</div>
                <div style="font-size:0.75rem; color:#A7F3D0; font-weight:700;">🌟 Gold Tier Civic Champion</div>
              </div>
            </div>
            <div class="civic-seal-badge">
              <div style="font-size:0.72rem; font-weight:900; color:#FDE047;">TALEGAON</div>
              <div style="font-size:0.65rem; color:#A7F3D0;">WARD 2 CITIZEN</div>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="civic-stats-grid">
            <div>
              <div class="civic-stat-val">1,240</div>
              <div class="civic-stat-lbl">Green Pts</div>
            </div>
            <div>
              <div class="civic-stat-val">48 kg</div>
              <div class="civic-stat-lbl">CO₂ Offset</div>
            </div>
            <div>
              <div class="civic-stat-val">100%</div>
              <div class="civic-stat-lbl">Segregation</div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; border-top:1px solid rgba(255,255,255,0.18); padding-top:12px; font-size:0.72rem;">
            <div style="text-align:left; color:#A7F3D0;">
              <div>Verified by CityAssist Realtime</div>
              <strong style="color:#FFF;">Certificate ID: TMC-2026-8849</strong>
            </div>
            <div style="background:#FFF; color:#0F172A; font-weight:900; padding:4px 8px; border-radius:6px; font-size:0.68rem;">
              QR VERIFIED ✓
            </div>
          </div>
        </div>

        <h3 style="font-size:1.2rem; font-weight:900; color:#0F172A; margin:0 0 6px;">Share Your Civic Green Score</h3>
        <p style="font-size:0.82rem; color:#64748B; margin:0 0 16px; line-height:1.4;">
          Inspire your friends and neighbors in Talegaon to segregate waste and keep our city clean!
        </p>

        <!-- Share Actions -->
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button type="button" onclick="window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent('🌱 I earned 1,240 Green Points and achieved Gold Civic Champion status in Talegaon with CityAssist! Join me in making our city cleaner: https://cityassist.app'), '_blank'); CityAssist.showToast('📲 WhatsApp sharing opened!');" style="background:#25D366; color:#FFF; border:none; padding:14px; border-radius:14px; font-weight:800; font-size:0.95rem; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; box-shadow:0 6px 18px rgba(37,211,102,0.35);">
            <span>📲 Share on WhatsApp</span>
          </button>

          <div style="display:flex; gap:10px;">
            <button type="button" onclick="navigator.clipboard.writeText('🌱 I earned 1,240 Green Points and achieved Gold Civic Champion status in Talegaon with CityAssist! Check out my certificate: TMC-2026-8849'); CityAssist.showToast('📋 Score summary copied to clipboard!');" style="flex:1; background:#F1F5F9; color:#334155; border:1px solid #CBD5E1; padding:12px; border-radius:12px; font-weight:800; font-size:0.85rem; cursor:pointer;">
              📋 Copy Link
            </button>
            <button type="button" onclick="CityAssist.showToast('📥 Certificate saved to photos!'); CityAssist.closeModal();" style="flex:1; background:#F8FAFC; color:#0F172A; border:1px solid #CBD5E1; padding:12px; border-radius:12px; font-weight:800; font-size:0.85rem; cursor:pointer;">
              📥 Save Image
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderBadgesModal() {
    return `
      <div class="modal-header-block">
        <h3 style="font-size:1.3rem; font-weight:800; margin-bottom:4px;">🏅 My Civic Badges (5)</h3>
        <p style="color:#64748B; font-size:0.88rem; margin-bottom:14px;">Milestones unlocked in your municipal partnership.</p>
      </div>

      <!-- 1,000 Points Milestone Gold Banner -->
      <div class="gold-milestone-banner" onclick="CityAssist.showCertificateModal()">
        <div style="font-size:2.4rem; animation:tada 2s infinite;">🏆</div>
        <div style="flex:1;">
          <div style="font-size:0.75rem; font-weight:800; color:#B45309; text-transform:uppercase; letter-spacing:0.5px;">★ 1,000 Points Milestone Reached! ★</div>
          <div style="font-size:1.05rem; font-weight:800; color:#92400E; margin:2px 0;">Gold Eco Champion Badge</div>
          <div style="font-size:0.8rem; color:#B45309;">Official PMC Civic Certificate Unlocked</div>
        </div>
        <button class="view-cert-link-btn">View ➜</button>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
        ${CityData.badges.map(b => `
          <div style="background:${b.isMilestone1000 ? 'linear-gradient(135deg, #FEF3C7, #FDE68A)' : '#F8FAFC'}; border:${b.isMilestone1000 ? '1.5px solid #F59E0B' : '1px solid #E2E8F0'}; border-radius:14px; padding:12px; text-align:center; position:relative;">
            ${b.isMilestone1000 ? `<span style="position:absolute; top:6px; right:6px; background:#F59E0B; color:#000; font-size:0.65rem; font-weight:800; padding:1px 6px; border-radius:10px;">1,000 PTS</span>` : ''}
            <div style="font-size:2rem; margin-bottom:4px;">${b.icon}</div>
            <div style="font-weight:700; font-size:0.92rem; margin-bottom:2px; color:#111827;">${b.title}</div>
            <div style="font-size:0.75rem; color:${b.isMilestone1000 ? '#92400E' : '#64748B'}; line-height:1.25;">${b.desc}</div>
          </div>
        `).join('')}
      </div>

      <div style="display:flex; gap:10px;">
        <button class="primary-green-btn" onclick="CityAssist.showCertificateModal()" style="flex:1;">
          📜 Download 1,000 Pts Certificate
        </button>
        <button onclick="CityAssist.closeModal()" style="background:#F1F5F9; color:#475569; border:none; padding:12px 16px; border-radius:10px; font-weight:700; cursor:pointer;">Close</button>
      </div>
    `;
  },

  renderCertificateModal() {
    return `
      <div class="certificate-modal-container">
        <!-- Official Certificate Frame -->
        <div class="official-certificate-paper" id="printable-certificate">
          <div class="cert-gold-border">
            <div class="cert-header">
              <div class="cert-emblem">🏛️</div>
              <div class="cert-authority-title">PUNE MUNICIPAL CORPORATION</div>
              <div class="cert-sub-title">DEPARTMENT OF CITIZEN STEWARDSHIP & SANITATION</div>
            </div>

            <div class="cert-main-award-title">CERTIFICATE OF CIVIC EXCELLENCE</div>
            <div class="cert-conferred-text">This honor is proudly presented to</div>

            <div class="cert-recipient-name">Siddhant Ramteke</div>

            <div class="cert-citation-body">
              For crossing the milestone of <strong>1,000+ Civic Impact Points</strong> and demonstrating outstanding dedication to waste segregation, responsible citizenship, and community cleanliness under the <strong>CityAssist Program</strong>.
            </div>

            <div class="cert-badge-row">
              <div class="cert-stamp-badge">
                <div class="stamp-star">★ ★ ★</div>
                <div class="stamp-text">GOLD ECO CHAMPION</div>
                <div class="stamp-points">1,240 PTS</div>
              </div>
            </div>

            <div class="cert-signatures-row">
              <div class="cert-sig-block">
                <div class="sig-line">Dr. Rajesh Kumar, IAS</div>
                <div class="sig-role">Municipal Commissioner, PMC</div>
              </div>
              <div class="cert-qr-block">
                <div class="cert-qr-box">
                  <svg viewBox="0 0 24 24" fill="#1E293B" width="36" height="36">
                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v4h-4v-4zm-4 4h4v4h-4v-4zm4-4h4v4h-4v-4z"/>
                  </svg>
                </div>
                <span class="cert-verify-tag">Verified #PMC-2026-882</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Download & Share Actions -->
        <div class="cert-actions-grid">
          <button class="cert-action-btn download-btn" onclick="CityAssist.downloadCertificatePDF()">
            📥 Download Certificate (PDF)
          </button>
          <button class="cert-action-btn share-btn" onclick="CityAssist.shareCertificate()">
            📤 Share Honor
          </button>
        </div>
        <button class="primary-green-btn" onclick="CityAssist.closeModal()" style="width:100%; margin-top:10px;">
          Done
        </button>
      </div>
    `;
  },

  renderAddressModal() {
    return `
      <div class="modal-header-block">
        <h3 style="font-size:1.35rem; font-weight:800; color:#111827; margin-bottom:4px;">📍 My Saved Addresses</h3>
        <p style="color:#64748B; font-size:0.85rem; margin-bottom:16px;">Manage service locations for waste collection & emergency dispatch.</p>
      </div>

      <!-- Quick Live Location Detector Button -->
      <button class="live-gps-detect-banner-btn" onclick="CityAssist.openAddAddressModal(true)" style="width:100%; background:linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%); border:1.5px solid #86EFAC; border-radius:16px; padding:14px 16px; display:flex; align-items:center; gap:12px; margin-bottom:16px; cursor:pointer; box-shadow:0 4px 14px rgba(22, 163, 74, 0.1); box-sizing:border-box;">
        <div class="gps-pulse-icon" style="width:38px; height:38px; background:#FFFFFF; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.08);">
          📍
        </div>
        <div style="flex:1; text-align:left;">
          <div style="font-weight:800; font-size:0.92rem; color:#15803D; margin-bottom:2px;">Auto-Detect Current GPS Location</div>
          <div style="font-size:0.75rem; color:#166534; font-weight:600;">Fetch your real live location & auto-fill address</div>
        </div>
        <span style="font-weight:900; color:#15803D; font-size:1.1rem; flex-shrink:0;">➜</span>
      </button>

      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:18px;">
        ${CityData.addresses.map((a, idx) => `
          <div style="background:${a.isDefault ? '#F0FDF4' : '#F8FAFC'}; border:${a.isDefault ? '1.5px solid #16A34A' : '1px solid #E2E8F0'}; border-radius:14px; padding:14px; display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <strong style="font-size:0.95rem; color:#111827;">${a.label}</strong>
                ${a.isDefault ? `<span style="background:#DCFCE7; color:#15803D; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:12px;">Active Primary</span>` : ''}
              </div>
              <div style="font-size:0.82rem; color:#475569; line-height:1.4;">${a.address}</div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
              ${!a.isDefault ? `
                <button onclick="CityAssist.setDefaultAddress(${idx})" style="background:#E2E8F0; color:#1E293B; border:none; padding:4px 10px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer; white-space:nowrap;">
                  Set Active
                </button>
              ` : ''}
              <button onclick="CityAssist.deleteAddress(${idx})" title="Delete Address" style="background:#FEE2E2; color:#DC2626; border:none; padding:4px 8px; border-radius:8px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:3px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Delete
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <button class="primary-green-btn" onclick="CityAssist.openAddAddressModal(false)" style="width:100%; display:flex; align-items:center; justify-content:center; gap:6px;">
        <span>+ Add New Address Manually</span>
      </button>
    `;
  },

  renderAddAddressModal(autoDetect = false) {
    return `
      <div class="modal-header-block">
        <h3 style="font-size:1.35rem; font-weight:800; color:#111827; margin-bottom:4px;">
          ${autoDetect ? '🛰️ Live GPS Location Detector' : '📍 Add New Address'}
        </h3>
        <p style="color:#64748B; font-size:0.85rem; margin-bottom:14px;">
          ${autoDetect ? 'Detecting your device coordinates and resolving your real street...' : 'Fill in your address details or pick a quick landmark.'}
        </p>
      </div>

      <!-- Live GPS Detector Action Card -->
      <div class="gps-detector-action-card" id="gps-detector-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="pulse-dot-green"></span>
            <strong style="font-size:0.85rem; color:#0F172A;">Device GPS Receiver</strong>
          </div>
          <span class="badge-sat-status" id="addr-gps-status">${autoDetect ? 'Detecting Real Location... 🛰️' : 'Ready to Detect'}</span>
        </div>

        <div style="font-size:0.78rem; color:#475569; margin-bottom:10px;" id="addr-coords-preview">
          Coordinates: Click below to detect real latitude & longitude
        </div>

        <button type="button" class="btn-trigger-gps" id="btn-detect-gps" onclick="CityAssist.detectLiveGPSAddress()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16">
            <circle cx="12" cy="12" r="7"/>
            <line x1="12" y1="2" x2="12" y2="5"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="5" y2="12"/>
            <line x1="19" y1="12" x2="22" y2="12"/>
          </svg>
          <span id="gps-btn-label">Detect My Live Doorstep Location</span>
        </button>
      </div>

      <!-- Quick Landmark Shortcuts -->
      <div style="margin-bottom:14px;">
        <div style="font-size:0.75rem; font-weight:800; color:#64748B; text-transform:uppercase; margin-bottom:6px;">Quick Landmark Shortcuts:</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          <button type="button" onclick="document.getElementById('addr-input-street').value='Samta Colony, Sector 2'; document.getElementById('addr-input-city').value='Talegaon Dabhade, Pune'; document.getElementById('addr-input-pin').value='410507'; document.getElementById('addr-input-lat').value='18.7285'; document.getElementById('addr-input-lng').value='73.6765';" style="background:#F0FDF4; border:1px solid #BBF7D0; color:#15803D; font-size:0.75rem; font-weight:800; padding:4px 8px; border-radius:8px; cursor:pointer;">🏠 Samta Colony</button>
          <button type="button" onclick="document.getElementById('addr-input-street').value='Near MIMER Medical College, Station Road'; document.getElementById('addr-input-city').value='Talegaon Dabhade, Pune'; document.getElementById('addr-input-pin').value='410507'; document.getElementById('addr-input-lat').value='18.7305'; document.getElementById('addr-input-lng').value='73.6810';" style="background:#F3E8FF; border:1px solid #D8B4FE; color:#7E22CE; font-size:0.75rem; font-weight:800; padding:4px 8px; border-radius:8px; cursor:pointer;">🎓 MIMER College</button>
          <button type="button" onclick="document.getElementById('addr-input-street').value='Station Road Bazaar, Near Rly Station'; document.getElementById('addr-input-city').value='Talegaon Dabhade, Pune'; document.getElementById('addr-input-pin').value='410506'; document.getElementById('addr-input-lat').value='18.7340'; document.getElementById('addr-input-lng').value='73.6700';" style="background:#EFF6FF; border:1px solid #BFDBFE; color:#1D4ED8; font-size:0.75rem; font-weight:800; padding:4px 8px; border-radius:8px; cursor:pointer;">🚆 Station Bazaar</button>
          <button type="button" onclick="document.getElementById('addr-input-street').value='Talegaon MIDC Tech Park 4'; document.getElementById('addr-input-city').value='Talegaon Dabhade, Pune'; document.getElementById('addr-input-pin').value='410507'; document.getElementById('addr-input-lat').value='18.7450'; document.getElementById('addr-input-lng').value='73.6820';" style="background:#FEF3C7; border:1px solid #FDE68A; color:#B45309; font-size:0.75rem; font-weight:800; padding:4px 8px; border-radius:8px; cursor:pointer;">🏭 MIDC Zone</button>
        </div>
      </div>

      <!-- Address Input Form -->
      <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:18px;">
        <!-- Hidden Coordinate Holders -->
        <input type="hidden" id="addr-input-lat" value="">
        <input type="hidden" id="addr-input-lng" value="">

        <div>
          <label style="display:block; font-size:0.8rem; font-weight:700; color:#334155; margin-bottom:4px;">Address Label</label>
          <input type="text" id="addr-input-label" placeholder="e.g. Home, Office, Studio" value="Home" style="width:100%; padding:10px 14px; border:1px solid #CBD5E1; border-radius:10px; font-size:0.9rem;">
        </div>

        <div>
          <label style="display:block; font-size:0.8rem; font-weight:700; color:#334155; margin-bottom:4px;">Flat / House / Wing (Optional)</label>
          <input type="text" id="addr-input-flat" placeholder="e.g. Flat 301, Building 4" value="" style="width:100%; padding:10px 14px; border:1px solid #CBD5E1; border-radius:10px; font-size:0.9rem;">
        </div>

        <div>
          <label style="display:block; font-size:0.8rem; font-weight:700; color:#334155; margin-bottom:4px;">Street, Locality & Ward</label>
          <input type="text" id="addr-input-street" placeholder="e.g. Samta Colony, Station Road" value="" style="width:100%; padding:10px 14px; border:1px solid #CBD5E1; border-radius:10px; font-size:0.9rem;">
        </div>

        <div style="display:flex; gap:10px;">
          <div style="flex:1;">
            <label style="display:block; font-size:0.8rem; font-weight:700; color:#334155; margin-bottom:4px;">City</label>
            <input type="text" id="addr-input-city" placeholder="City" value="Talegaon Dabhade, Pune" style="width:100%; padding:10px 14px; border:1px solid #CBD5E1; border-radius:10px; font-size:0.9rem;">
          </div>
          <div style="flex:1;">
            <label style="display:block; font-size:0.8rem; font-weight:700; color:#334155; margin-bottom:4px;">Pincode</label>
            <input type="text" id="addr-input-pin" placeholder="Pincode" value="410507" style="width:100%; padding:10px 14px; border:1px solid #CBD5E1; border-radius:10px; font-size:0.9rem;">
          </div>
        </div>

        <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#475569; cursor:pointer; margin-top:2px;">
          <input type="checkbox" id="addr-input-default" checked>
          <span>Set as Active Primary Location for Collections & Services</span>
        </label>

        <div style="display:flex; gap:10px; margin-top:8px;">
          <button type="button" class="primary-green-btn" onclick="CityAssist.saveNewAddress()" style="flex:1;">Save Address</button>
          <button type="button" onclick="CityAssist.showAddressModal()" style="background:#F1F5F9; color:#475569; border:none; padding:10px 16px; border-radius:10px; font-weight:700; cursor:pointer;">Cancel</button>
        </div>
      </div>
    `;
  },

  renderNotificationsModal() {
    return `
      <div class="modal-header-block" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
        <div>
          <h3 style="font-size:1.35rem; font-weight:900; color:#0F172A; margin-bottom:4px;">🔔 Notifications</h3>
          <p style="color:#64748B; font-size:0.85rem;">Live updates, collection alerts & awards</p>
        </div>
        <button onclick="CityAssist.clearNotifications()" style="background:#F1F5F9; border:none; color:#0F7943; font-size:0.75rem; font-weight:800; padding:6px 10px; border-radius:12px; cursor:pointer;">
          Mark all read
        </button>
      </div>

      <div class="notifications-list" style="display:flex; flex-direction:column; gap:10px; max-height:360px; overflow-y:auto; margin-bottom:18px;">
        ${CityData.notifications.map((n, idx) => `
          <div style="background:${idx === 0 ? '#F0FDF4' : '#FFFFFF'}; border:1px solid ${idx === 0 ? '#BBF7D0' : '#E2E8F0'}; border-radius:16px; padding:14px; display:flex; gap:12px; align-items:flex-start; box-shadow:0 2px 6px rgba(0,0,0,0.02); transition:var(--transition-fast);">
            <div style="width:38px; height:38px; border-radius:50%; background:${idx === 0 ? '#DCFCE7' : '#F1F5F9'}; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:1.1rem;">
              ${n.title.includes('Truck') || n.title.includes('Waste') ? '🚛' : n.title.includes('Milestone') || n.title.includes('Points') ? '🏆' : '📢'}
            </div>
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                <h4 style="font-weight:800; font-size:0.92rem; color:#111827;">${n.title}</h4>
                <span style="font-size:0.72rem; font-weight:700; color:${idx === 0 ? '#15803D' : '#94A3B8'};">${n.time}</span>
              </div>
              <p style="font-size:0.82rem; color:#475569; line-height:1.35;">${n.desc}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <button class="primary-green-btn" onclick="CityAssist.closeModal()" style="width:100%;">Close</button>
    `;
  },

  renderScannerModal() {
    return `
      <div style="text-align:center; padding:10px 0 16px;">
        <div style="width:200px; height:200px; margin:0 auto 16px; border:2px dashed #0F7943; border-radius:16px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#F0FDF4; position:relative;">
          <div style="font-size:3rem; margin-bottom:8px;">📷</div>
          <span style="font-size:0.85rem; font-weight:700; color:#15803D;">Scanning Waste QR...</span>
          <div style="position:absolute; width:80%; height:2px; background:#10B981; animation:scan-line 2s infinite ease-in-out;"></div>
        </div>
        <p style="font-size:0.85rem; color:#64748B; margin-bottom:16px;">Align camera with QR code printed on your residential segregation bin.</p>
        <button class="primary-green-btn" onclick="CityAssist.showToast('Bin #4920 QR Verified! +10 points awarded'); CityAssist.closeModal();">Simulate Scan Success</button>
      </div>
    `;
  },

  renderCommunityPost(post) {
    return `
      <article class="community-post-card" id="post-card-${post.id}">
        <div class="post-header-row">
          <div class="post-author-block">
            ${post.author.isOfficial ? `
              <div class="official-admin-avatar">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5zm4 4h-2v-6h2v6z"/>
                </svg>
              </div>
            ` : `
              <img src="${post.author.avatar}" alt="${post.author.name}" class="post-author-avatar">
            `}
            <div class="post-author-details">
              <span class="post-author-name">${post.author.name}</span>
              <span class="post-author-role">${post.author.role}</span>
            </div>
          </div>
          <div class="post-header-meta">
            <span class="post-time-tag">${post.time}</span>
            <span class="post-badge-pill ${post.badgeType}">${post.badgeText}</span>
          </div>
        </div>

        <div class="post-body-container ${post.isBeforeAfter ? 'has-slider' : ''}">
          <p class="post-text-content">${post.text}</p>

          ${post.isBeforeAfter ? `
            <!-- Interactive Before/After Split Comparison Slider -->
            <div class="before-after-slider-container" id="ba-container-${post.id}" 
                 onpointerdown="CommunityEngine.handlePointerStart(event, '${post.id}')"
                 onpointermove="CommunityEngine.handleSliderMove(event, '${post.id}')"
                 ontouchstart="CommunityEngine.handleSliderTouch(event, '${post.id}')"
                 ontouchmove="CommunityEngine.handleSliderTouch(event, '${post.id}')">
              
              <!-- After Layer (Cleaned & Green space - Background) -->
              <div class="ba-image-layer after-layer">
                <img src="${post.afterImage}" alt="Cleaned Green Area" class="ba-img">
                <span class="ba-tag tag-after">AFTER • PMC SQUAD CLEAN</span>
              </div>

              <!-- Before Layer (Dirty littered space - Foreground clipped) -->
              <div class="ba-image-layer before-layer" id="ba-before-layer-${post.id}">
                <img src="${post.beforeImage}" alt="Littered Spot" class="ba-img">
                <span class="ba-tag tag-before">BEFORE • LITTERED CORNER</span>
              </div>

              <!-- Draggable Divider Line & Handle Knob -->
              <div class="ba-slider-handle" id="ba-handle-${post.id}" style="left: 50%;">
                <div class="ba-handle-line"></div>
                <div class="ba-handle-knob">
                  <span style="font-size:11px; color:#0F7943; font-weight:900;">◀ ▶</span>
                </div>
              </div>
            </div>
            <div class="ba-instructions-hint">
              <span>⟵ Drag or slide to compare messy vs cleaned transformation ⟶</span>
            </div>
          ` : (post.image ? `
            <img src="${post.image}" alt="Community photo" class="post-media-thumbnail" onclick="CityAssist.viewFullImage('${post.image}')">
          ` : '')}
        </div>

        <div class="post-footer-actions">
          <div class="post-left-actions">
            <!-- Like Action Button -->
            <button class="post-action-btn ${post.isLiked ? 'liked' : ''}" onclick="CommunityEngine.toggleLike('${post.id}')">
              <svg viewBox="0 0 24 24" fill="${post.isLiked ? '#EF4444' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span>${post.likes}</span>
            </button>

            <!-- Comment Action Button -->
            <button class="post-action-btn" onclick="CommunityEngine.openCommentsModal('${post.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>${post.comments}</span>
            </button>
          </div>

          <!-- Bookmark Action Button -->
          <button class="post-action-btn ${post.isBookmarked ? 'bookmarked' : ''}" onclick="CommunityEngine.toggleBookmark('${post.id}')" title="Save Post">
            <svg viewBox="0 0 24 24" fill="${post.isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>
      </article>
    `;
  },

  renderCreatePostModal() {
    return `
      <div class="modal-header-block">
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:2px;">✍️ Create Community Post</h3>
        <p style="color:#64748B; font-size:0.82rem; margin-bottom:12px;">Share appreciation, report local issues, or post a Before/After transformation.</p>
      </div>

      <!-- Post Format Selector Tabs -->
      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:0.8rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
          1. Choose Post Format
        </label>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <button type="button" id="tab-post-format-standard" onclick="CommunityEngine.setPostFormat('standard')" style="padding:10px 8px; border-radius:12px; border:1.5px solid #0F7943; background:#F0FDF4; color:#15803D; font-weight:800; font-size:0.82rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
            <span>📸</span> Single Photo Post
          </button>
          <button type="button" id="tab-post-format-beforeafter" onclick="CommunityEngine.setPostFormat('beforeafter')" style="padding:10px 8px; border-radius:12px; border:1.5px solid #E2E8F0; background:#F8FAFC; color:#64748B; font-weight:800; font-size:0.82rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
            <span>🔄</span> Before & After Slider
          </button>
        </div>
      </div>

      <!-- Category Selector -->
      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:0.8rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
          2. Select Category
        </label>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
          <label style="display:flex; align-items:center; gap:6px; font-size:0.82rem; font-weight:700; background:#F8FAFC; border:1px solid #E2E8F0; padding:7px 10px; border-radius:10px; cursor:pointer;">
            <input type="radio" name="comm-post-cat" value="appreciate" checked style="accent-color:#16A34A;">
            💛 Appreciation
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:0.82rem; font-weight:700; background:#F8FAFC; border:1px solid #E2E8F0; padding:7px 10px; border-radius:10px; cursor:pointer;">
            <input type="radio" name="comm-post-cat" value="report" style="accent-color:#EF4444;">
            ⚠️ Report Issue
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:0.82rem; font-weight:700; background:#F8FAFC; border:1px solid #E2E8F0; padding:7px 10px; border-radius:10px; cursor:pointer;">
            <input type="radio" name="comm-post-cat" value="updates" style="accent-color:#3B82F6;">
            📢 Public Update
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:0.82rem; font-weight:700; background:#F8FAFC; border:1px solid #E2E8F0; padding:7px 10px; border-radius:10px; cursor:pointer;">
            <input type="radio" name="comm-post-cat" value="events" style="accent-color:#8B5CF6;">
            📅 Community Event
          </label>
        </div>
      </div>

      <!-- Message Textarea -->
      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:0.8rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
          3. Message / Description
        </label>
        <textarea id="new-post-text-input" placeholder="Describe the transformation or neighborhood update..." style="width:100%; height:75px; border:1px solid #CBD5E1; border-radius:12px; padding:10px; font-size:0.88rem; outline:none; resize:none; font-family:inherit;"></textarea>
      </div>

      <!-- Single Photo Upload Section -->
      <div id="section-upload-standard" style="margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label style="font-size:0.8rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px; margin:0;">
            4. Attach Photo
          </label>
          <button type="button" onclick="CommunityEngine.triggerCommunityAIVision()" style="background:#ECFDF5; border:1px solid #A7F3D0; color:#059669; font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
            <span>✨ AI Vision Auto-Triage</span>
          </button>
        </div>
        <div onclick="document.getElementById('post-photo-file-input').click()" style="border:1.5px dashed #CBD5E1; border-radius:12px; padding:12px; text-align:center; background:#F8FAFC; cursor:pointer;">
          <input type="file" id="post-photo-file-input" accept="image/*" style="display:none;" onchange="CommunityEngine.handlePostPhoto(event)">
          <div id="post-photo-preview-box">
            <span style="font-size:1.3rem;">📷</span>
            <span style="font-size:0.85rem; font-weight:700; color:#64748B; margin-left:6px;">Tap to select photo</span>
          </div>
        </div>

        <!-- Sample Presets for Quick Testing -->
        <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
          <span style="font-size:0.72rem; color:#64748B; font-weight:700; align-self:center;">⚡ Try Sample:</span>
          <button type="button" onclick="CommunityEngine.loadPresetScenario('overflowing_bin')" style="background:#FEF2F2; border:1px solid #FECACA; color:#DC2626; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
            🚨 Overflowing Bin
          </button>
          <button type="button" onclick="CommunityEngine.loadPresetScenario('road_pothole')" style="background:#FFFBEB; border:1px solid #FDE68A; color:#D97706; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
            🕳️ Road Pothole
          </button>
          <button type="button" onclick="CommunityEngine.loadPresetScenario('broken_streetlight')" style="background:#F3F4F6; border:1px solid #E5E7EB; color:#374151; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
            💡 Broken Light
          </button>
          <button type="button" onclick="CommunityEngine.loadPresetScenario('tree_plantation')" style="background:#F0FDF4; border:1px solid #BBF7D0; color:#15803D; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
            🌺 Tree Planting
          </button>
          <button type="button" onclick="CommunityEngine.loadPresetScenario('sanitation_gratitude')" style="background:#EFF6FF; border:1px solid #BFDBFE; color:#2563EB; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
            💛 Worker Kudos
          </button>
        </div>
      </div>

      <!-- Two-Image Before & After Upload Section -->
      <div id="section-upload-beforeafter" style="display:none; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label style="font-size:0.8rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px; margin:0;">
            4. Upload Before & After Photos
          </label>
          <button type="button" onclick="CommunityEngine.triggerCommunityAIVision()" style="background:#ECFDF5; border:1px solid #A7F3D0; color:#059669; font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
            <span>✨ AI Vision Auto-Triage</span>
          </button>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <!-- 1. BEFORE PHOTO CARD -->
          <div style="background:#FFF5F5; border:1.5px dashed #FECACA; border-radius:14px; padding:10px; text-align:center; position:relative;">
            <div style="font-size:0.75rem; font-weight:900; color:#DC2626; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; display:flex; align-items:center; justify-content:center; gap:4px;">
              <span>🛑</span> BEFORE PHOTO
            </div>
            
            <input type="file" id="post-before-file-input" accept="image/*" style="display:none;" onchange="CommunityEngine.handleBeforePhoto(event)">
            
            <div id="post-before-preview-box" onclick="document.getElementById('post-before-file-input').click()" style="cursor:pointer; min-height:85px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#FFFFFF; border:1px solid #FEE2E2; border-radius:10px; padding:6px;">
              <span style="font-size:1.3rem;">📸</span>
              <span style="font-size:0.75rem; font-weight:800; color:#DC2626; margin-top:2px;">Upload "Before"</span>
              <span style="font-size:0.65rem; color:#94A3B8;">(Littered / Messy)</span>
            </div>
          </div>

          <!-- 2. AFTER PHOTO CARD -->
          <div style="background:#F0FDF4; border:1.5px dashed #BBF7D0; border-radius:14px; padding:10px; text-align:center; position:relative;">
            <div style="font-size:0.75rem; font-weight:900; color:#15803D; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; display:flex; align-items:center; justify-content:center; gap:4px;">
              <span>✨</span> AFTER PHOTO
            </div>
            
            <input type="file" id="post-after-file-input" accept="image/*" style="display:none;" onchange="CommunityEngine.handleAfterPhoto(event)">
            
            <div id="post-after-preview-box" onclick="document.getElementById('post-after-file-input').click()" style="cursor:pointer; min-height:85px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#FFFFFF; border:1px solid #DCFCE7; border-radius:10px; padding:6px;">
              <span style="font-size:1.3rem;">🌿</span>
              <span style="font-size:0.75rem; font-weight:800; color:#15803D; margin-top:2px;">Upload "After"</span>
              <span style="font-size:0.65rem; color:#94A3B8;">(Cleaned / Fixed)</span>
            </div>
          </div>
        </div>

        <!-- Quick Sample Preset Fill -->
        <div style="margin-top:8px; text-align:center;">
          <button type="button" onclick="CommunityEngine.loadSampleBeforeAfter()" style="background:#F8FAFC; border:1px solid #E2E8F0; padding:4px 10px; border-radius:12px; font-size:0.72rem; font-weight:700; color:#475569; cursor:pointer;">
            ⚡ Or test with sample Before/After photos
          </button>
        </div>
      </div>

      <!-- AI Community Story Scan Overlay -->
      <div id="comm-ai-scanner-wrap" style="display:none; background:#0F172A; border-radius:14px; padding:12px; margin-bottom:14px; position:relative; overflow:hidden;">
        <div class="ai-scan-laser"></div>
        <div style="display:flex; align-items:center; gap:10px; position:relative; z-index:11;">
          <span style="font-size:1.5rem; animation:pulse 1s infinite alternate;">🧠</span>
          <div>
            <div style="font-size:0.85rem; font-weight:800; color:#34D399;">AI Vision Analyzing Community Scene...</div>
            <div id="comm-ai-status-text" style="font-size:0.75rem; color:#E2E8F0; font-family:monospace;">Classifying Complaint vs Appreciation...</div>
          </div>
        </div>
      </div>

      <!-- AI Triage Result Classification Badge -->
      <div id="comm-ai-triage-badge" style="display:none; padding:8px 12px; border-radius:12px; margin-bottom:14px; font-size:0.8rem; font-weight:800; display:none; align-items:center; justify-content:space-between;"></div>

      <!-- Action Buttons -->
      <div style="display:flex; gap:10px;">
        <button class="primary-green-btn" onclick="CommunityEngine.publishPost()" style="flex:1; padding:12px; font-weight:800; font-size:0.92rem;">
          🚀 Publish Post to Feed
        </button>
        <button onclick="CityAssist.closeModal()" style="background:#F1F5F9; color:#475569; border:none; padding:12px 16px; border-radius:12px; font-weight:700; cursor:pointer;">
          Cancel
        </button>
      </div>
    `;
  },

  renderResponsibleCitizenModal() {
    return `
      <div class="responsible-guide-modal">
        <div class="responsible-guide-header">
          <h3 class="responsible-guide-title">How to be a Responsible Citizen</h3>
        </div>

        <div class="responsible-guide-list">
          <!-- 1. Segregate Your Waste -->
          <div class="responsible-guide-card">
            <div class="guide-icon-box bg-green">
              <svg viewBox="0 0 24 24" class="guide-svg-icon" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </div>
            <div class="guide-card-content">
              <h4 class="guide-card-heading">1. Segregate Your Waste</h4>
              <p class="guide-card-text">Separate wet and dry waste. Give dry waste to recyclers and wet waste for composting.</p>
            </div>
          </div>

          <!-- 2. Follow Collection Timings -->
          <div class="responsible-guide-card">
            <div class="guide-icon-box bg-blue">
              <svg viewBox="0 0 24 24" class="guide-svg-icon" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div class="guide-card-content">
              <h4 class="guide-card-heading">2. Follow Collection Timings</h4>
              <p class="guide-card-text">Keep your waste outside only at the scheduled time of collection.</p>
            </div>
          </div>

          <!-- 3. Don't Litter -->
          <div class="responsible-guide-card">
            <div class="guide-icon-box bg-red">
              <svg viewBox="0 0 24 24" class="guide-svg-icon" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                <circle cx="10" cy="8" r="1.5" fill="#DC2626" stroke="none"></circle>
                <path d="M8 17l2-5 3 2"></path>
                <circle cx="15" cy="15" r="0.8" fill="#DC2626"></circle>
              </svg>
            </div>
            <div class="guide-card-content">
              <h4 class="guide-card-heading">3. Don't Litter</h4>
              <p class="guide-card-text">Never throw garbage on roads, open plots, or public places.</p>
            </div>
          </div>

          <!-- 4. Report and Help -->
          <div class="responsible-guide-card">
            <div class="guide-icon-box bg-green">
              <svg viewBox="0 0 24 24" class="guide-svg-icon" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </div>
            <div class="guide-card-content">
              <h4 class="guide-card-heading">4. Report and Help</h4>
              <p class="guide-card-text">Report issues like overflow, illegal dumping or missed pickup through CityAssist.</p>
            </div>
          </div>

          <!-- 5. Appreciate and Encourage -->
          <div class="responsible-guide-card">
            <div class="guide-icon-box bg-green">
              <svg viewBox="0 0 24 24" class="guide-svg-icon" fill="#16A34A" stroke="#16A34A" stroke-width="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </div>
            <div class="guide-card-content">
              <h4 class="guide-card-heading">5. Appreciate and Encourage</h4>
              <p class="guide-card-text">Appreciate the hard work of sanitation workers and encourage others to keep our city clean.</p>
            </div>
          </div>

          <!-- 6. Reduce, Reuse, Recycle -->
          <div class="responsible-guide-card">
            <div class="guide-icon-box bg-green">
              <svg viewBox="0 0 24 24" class="guide-svg-icon" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 20h10"></path>
                <path d="M12 20v-8"></path>
                <path d="M12 12c-3 0-6-3-6-6 4 0 6 3 6 6z"></path>
                <path d="M12 14c3 0 6-3 6-6-4 0-6 3-6 6z"></path>
              </svg>
            </div>
            <div class="guide-card-content">
              <h4 class="guide-card-heading">6. Reduce, Reuse, Recycle</h4>
              <p class="guide-card-text">Use less plastic, reuse what you can, and recycle whenever possible.</p>
            </div>
          </div>
        </div>

        <!-- Bottom Banner -->
        <div class="responsible-guide-footer">
          <div class="guide-footer-leaf-wrap">
            <svg viewBox="0 0 24 24" class="guide-leaf-icon" fill="none" stroke="#15803D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
            </svg>
          </div>
          <div class="guide-footer-text-block">
            <h5 class="guide-footer-tagline">Small steps today, better tomorrow.</h5>
            <p class="guide-footer-sub">Let's build a cleaner and healthier city together!</p>
          </div>
          <div class="guide-footer-people-wrap">
            <svg viewBox="0 0 24 24" class="guide-people-icon" fill="none" stroke="#15803D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
        </div>
      </div>
    `;
  },

  renderFullScreenRouteMap() {
    const telemetry = (typeof GPSTrackerEngine !== 'undefined') ? GPSTrackerEngine.driverTelemetry : { lat: 18.5342, lng: 73.8432, speed: 22, progressPct: 45 };
    const citizen = (typeof GPSTrackerEngine !== 'undefined') ? GPSTrackerEngine.citizenLocation : { lat: 18.5308, lng: 73.8474 };
    
    return `
      <div class="fs-map-modal-container">
        <!-- Top Modal Header Bar -->
        <div class="fs-map-header">
          <div class="fs-map-title-group">
            <button class="fs-map-close-btn" onclick="CityAssist.closeModal()" title="Close Fullscreen Map">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div>
              <h3 class="fs-map-main-title">Talegaon Ward 2 Route Map</h3>
              <p class="fs-map-sub-title">Talegaon Dabhade • Station to Samta Colony</p>
            </div>
          </div>
          <div class="fs-map-status-pill">
            <span class="pulse-dot-green"></span> Live GPS Fleet
          </div>
        </div>

        <!-- Route Filter & Map Theme Selector Pills -->
        <div class="fs-route-filter-bar" style="margin-bottom:6px;">
          <button class="fs-route-chip active" id="chip-route-all" onclick="CityAssist.filterFullscreenRoute('all')">🗺️ All Routes (3)</button>
          <button class="fs-route-chip" id="chip-route-4b" onclick="CityAssist.filterFullscreenRoute('4b')">🟢 Route 4B (Active)</button>
          <button class="fs-route-chip" id="chip-route-4a" onclick="CityAssist.filterFullscreenRoute('4a')">🔵 Route 4A (Morning)</button>
          <button class="fs-route-chip" id="chip-route-4c" onclick="CityAssist.filterFullscreenRoute('4c')">🟠 Route 4C (Commercial)</button>
        </div>

        <!-- Landmarks Category Filter Bar -->
        <div style="display:flex; align-items:center; gap:5px; overflow-x:auto; padding:4px 0 6px 0; margin-bottom:6px; scrollbar-width:none;">
          <span style="font-size:0.7rem; font-weight:800; color:#64748B; white-space:nowrap;">Landmarks:</span>
          <button type="button" class="landmark-filter-chip active" data-cat="all" onclick="LeafletMapEngine.filterLandmarkCategory('all')" style="background:#0F7943; color:#FFF; border:none; padding:3px 8px; border-radius:10px; font-size:0.72rem; font-weight:800; cursor:pointer; white-space:nowrap;">🌟 All (20)</button>
          <button type="button" class="landmark-filter-chip" data-cat="college" onclick="LeafletMapEngine.filterLandmarkCategory('college')" style="background:#F3E8FF; color:#7E22CE; border:1px solid #D8B4FE; padding:3px 8px; border-radius:10px; font-size:0.72rem; font-weight:800; cursor:pointer; white-space:nowrap;">🎓 Colleges</button>
          <button type="button" class="landmark-filter-chip" data-cat="hospital" onclick="LeafletMapEngine.filterLandmarkCategory('hospital')" style="background:#FEE2E2; color:#DC2626; border:1px solid #FECACA; padding:3px 8px; border-radius:10px; font-size:0.72rem; font-weight:800; cursor:pointer; white-space:nowrap;">🏥 Hospitals</button>
          <button type="button" class="landmark-filter-chip" data-cat="shop" onclick="LeafletMapEngine.filterLandmarkCategory('shop')" style="background:#FEF3C7; color:#B45309; border:1px solid #FDE68A; padding:3px 8px; border-radius:10px; font-size:0.72rem; font-weight:800; cursor:pointer; white-space:nowrap;">🛒 Shops & Food</button>
          <button type="button" class="landmark-filter-chip" data-cat="civic" onclick="LeafletMapEngine.filterLandmarkCategory('civic')" style="background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; padding:3px 8px; border-radius:10px; font-size:0.72rem; font-weight:800; cursor:pointer; white-space:nowrap;">🏛️ Civic/Transit</button>
          <button type="button" id="btn-toggle-landmarks-fs" onclick="LeafletMapEngine.toggleLandmarks()" style="background:#DCFCE7; color:#15803D; border:1px solid #BBF7D0; padding:3px 8px; border-radius:10px; font-size:0.72rem; font-weight:800; cursor:pointer; white-space:nowrap;">👁️ Toggle</button>
        </div>

        <!-- Map Layer Switcher (100% Free, Zero API Key Required) -->
        <div class="fs-theme-selector-bar">
          <span style="font-size:0.72rem; font-weight:800; color:#64748B; margin-right:4px;">Layer:</span>
          <button class="map-theme-chip active" data-theme="osm" onclick="LeafletMapEngine.setMapTheme('osm')">🗺️ OpenStreetMap</button>
          <button class="map-theme-chip" data-theme="clean" onclick="LeafletMapEngine.setMapTheme('clean')">🏙️ Clean Streets</button>
          <button class="map-theme-chip" data-theme="satellite" onclick="LeafletMapEngine.setMapTheme('satellite')">🛰️ Satellite View</button>
        </div>

        <!-- Fullscreen Interactive Leaflet & Vector Map Viewport -->
        <div class="fs-map-viewport" style="height: 320px;">
          <!-- Interactive Leaflet Map Container -->
          <div id="fs-leaflet-map-view" style="width:100%; height:100%; border-radius:16px;"></div>

          <!-- Fallback SVG Canvas -->
          <svg viewBox="0 0 500 360" class="fs-map-svg" id="fs-complete-routes-svg" style="display:none;">
            <defs>
              <pattern id="fsGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#F1F5F9" stroke-width="1.2"/>
              </pattern>
              <!-- Route Gradients -->
              <linearGradient id="gradRoute4B" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#16A34A"/>
                <stop offset="50%" stop-color="#22C55E"/>
                <stop offset="100%" stop-color="#059669"/>
              </linearGradient>
              <linearGradient id="gradRoute4A" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#2563EB"/>
                <stop offset="100%" stop-color="#60A5FA"/>
              </linearGradient>
              <linearGradient id="gradRoute4C" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#EA580C"/>
                <stop offset="100%" stop-color="#F97316"/>
              </linearGradient>
            </defs>

            <!-- Base Canvas & Grid -->
            <rect width="500" height="360" rx="14" fill="#F8FAFC"/>
            <rect width="500" height="360" rx="14" fill="url(#fsGrid)"/>

            <!-- Land Zones & Parks -->
            <rect x="30" y="30" width="80" height="60" rx="8" fill="#DCFCE7" opacity="0.6"/>
            <text x="70" y="65" font-size="9" fill="#15803D" font-weight="700" text-anchor="middle">Sector 2 Park</text>

            <rect x="350" y="240" width="110" height="70" rx="8" fill="#E0F2FE" opacity="0.6"/>
            <text x="405" y="280" font-size="9" fill="#0369A1" font-weight="700" text-anchor="middle">Sector 4 Depot Zone</text>

            <rect x="220" y="50" width="100" height="50" rx="8" fill="#FEF3C7" opacity="0.5"/>
            <text x="270" y="80" font-size="9" fill="#B45309" font-weight="700" text-anchor="middle">Model Colony</text>

            <!-- Major Arterial Roads -->
            <!-- Main North-South Highway -->
            <path d="M120,-10 L160,370" stroke="#FFFFFF" stroke-width="18"/>
            <path d="M120,-10 L160,370" stroke="#CBD5E1" stroke-width="12"/>
            <!-- East-West Cross Arterial -->
            <path d="M-10,180 L510,190" stroke="#FFFFFF" stroke-width="18"/>
            <path d="M-10,180 L510,190" stroke="#CBD5E1" stroke-width="12"/>
            <!-- Diagonal Arterials -->
            <path d="M300,-10 L260,370" stroke="#FFFFFF" stroke-width="14"/>
            <path d="M300,-10 L260,370" stroke="#E2E8F0" stroke-width="8"/>
            <path d="M-10,90 L510,280" stroke="#FFFFFF" stroke-width="14"/>
            <path d="M-10,90 L510,280" stroke="#E2E8F0" stroke-width="8"/>

            <!-- ================= ROUTE 4A (Morning Feeder - Blue) ================= -->
            <g id="fs-group-route-4a">
              <path d="M40,290 C120,290 140,210 240,180" stroke="url(#gradRoute4A)" stroke-width="5" stroke-dasharray="5,4" fill="none" opacity="0.8"/>
              <!-- Route 4A Stops -->
              <circle cx="40" cy="290" r="6" fill="#2563EB" stroke="#FFFFFF" stroke-width="2"/>
              <text x="40" y="310" font-size="8" font-weight="700" fill="#1E40AF" text-anchor="middle">FC Road Junction (07:30)</text>
              <circle cx="240" cy="180" r="6" fill="#2563EB" stroke="#FFFFFF" stroke-width="2"/>
              <text x="240" y="170" font-size="8" font-weight="700" fill="#1E40AF" text-anchor="middle">Central Link</text>
            </g>

            <!-- ================= ROUTE 4C (Commercial - Orange) ================= -->
            <g id="fs-group-route-4c">
              <path d="M250,30 C340,30 380,120 450,150" stroke="url(#gradRoute4C)" stroke-width="5" stroke-dasharray="5,4" fill="none" opacity="0.8"/>
              <!-- Route 4C Stops -->
              <circle cx="250" cy="30" r="6" fill="#EA580C" stroke="#FFFFFF" stroke-width="2"/>
              <text x="250" y="20" font-size="8" font-weight="700" fill="#C2410C" text-anchor="middle">JM Road Plaza (10:00)</text>
              <circle cx="450" cy="150" r="6" fill="#EA580C" stroke="#FFFFFF" stroke-width="2"/>
              <text x="450" y="140" font-size="8" font-weight="700" fill="#C2410C" text-anchor="middle">University Circle</text>
            </g>

            <!-- ================= PRIMARY ROUTE 4B (Active Live - Green) ================= -->
            <g id="fs-group-route-4b">
              <!-- Route Glow Outline -->
              <path d="M70,70 Q180,40 240,110 T330,210 T420,270" stroke="#16A34A" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.25"/>
              <!-- Route Line -->
              <path d="M70,70 Q180,40 240,110 T330,210 T420,270" stroke="url(#gradRoute4B)" stroke-width="5" stroke-linecap="round" fill="none" id="fs-route-4b-path"/>

              <!-- Checkpoint 1 (Start) -->
              <g transform="translate(70, 70)">
                <circle cx="0" cy="0" r="9" fill="#15803D" stroke="#FFFFFF" stroke-width="2.5"/>
                <text x="0" y="3" font-size="8" font-weight="900" fill="#FFFFFF" text-anchor="middle">1</text>
                <text x="0" y="20" font-size="8" font-weight="800" fill="#15803D" text-anchor="middle">Sector 2 (Start)</text>
              </g>

              <!-- Checkpoint 2 -->
              <g transform="translate(185, 62)">
                <circle cx="0" cy="0" r="9" fill="#16A34A" stroke="#FFFFFF" stroke-width="2.5"/>
                <text x="0" y="3" font-size="8" font-weight="900" fill="#FFFFFF" text-anchor="middle">2</text>
                <text x="0" y="-12" font-size="8" font-weight="800" fill="#166534" text-anchor="middle">Model Colony</text>
              </g>

              <!-- Checkpoint 3 (Doorstep Zone) -->
              <g transform="translate(240, 110)">
                <circle cx="0" cy="0" r="9" fill="#2563EB" stroke="#FFFFFF" stroke-width="2.5"/>
                <text x="0" y="3" font-size="8" font-weight="900" fill="#FFFFFF" text-anchor="middle">3</text>
                <text x="0" y="-14" font-size="8" font-weight="800" fill="#1D4ED8" text-anchor="middle">Green Ave (Doorstep)</text>
              </g>

              <!-- Checkpoint 4 -->
              <g transform="translate(330, 210)">
                <circle cx="0" cy="0" r="9" fill="#16A34A" stroke="#FFFFFF" stroke-width="2.5"/>
                <text x="0" y="3" font-size="8" font-weight="900" fill="#FFFFFF" text-anchor="middle">4</text>
                <text x="0" y="20" font-size="8" font-weight="800" fill="#166534" text-anchor="middle">FC Road Approach</text>
              </g>

              <!-- Checkpoint 5 (Depot Destination) -->
              <g transform="translate(420, 270)">
                <circle cx="0" cy="0" r="10" fill="#DC2626" stroke="#FFFFFF" stroke-width="2.5"/>
                <text x="0" y="3" font-size="9" font-weight="900" fill="#FFFFFF" text-anchor="middle">🏁</text>
                <text x="0" y="20" font-size="8" font-weight="800" fill="#B91C1C" text-anchor="middle">Sector 4 Depot (End)</text>
              </g>

              <!-- Citizen Home Target Marker -->
              <g transform="translate(255, 125)" id="fs-citizen-pin">
                <circle cx="0" cy="0" r="14" fill="#2563EB" opacity="0.2" class="driver-radar-ping"/>
                <circle cx="0" cy="0" r="9" fill="#FFFFFF" stroke="#2563EB" stroke-width="3"/>
                <circle cx="0" cy="0" r="4" fill="#2563EB"/>
                <text x="0" y="22" font-size="8" font-weight="800" fill="#1E40AF" text-anchor="middle">📍 Your Doorstep</text>
              </g>

              <!-- Moving Garbage Vehicle Pin -->
              <g transform="translate(200, 75)" id="fs-live-truck-marker">
                <circle cx="0" cy="0" r="18" fill="#16A34A" opacity="0.3" class="driver-radar-ping"/>
                <circle cx="0" cy="0" r="13" fill="#15803D" stroke="#FFFFFF" stroke-width="2.5"/>
                <text x="0" y="4" font-size="12" text-anchor="middle" fill="#FFFFFF">🚚</text>
              </g>
            </g>
          </svg>

          <!-- Floating GPS Telemetry Overlay Tag -->
          <div class="fs-map-telemetry-badge">
            <span class="telemetry-dot"></span>
            <span id="fs-telemetry-readout">GPS: 18.5342° N, 73.8432° E • Vehicle #MH-12-EA-4920</span>
          </div>

          <!-- Floating Map Recenter Controls -->
          <div class="fs-floating-controls">
            <button type="button" class="fs-float-btn" onclick="CityAssist.recenterFullscreenVehicle()" title="Focus on Garbage Truck">
              🚚 Center Truck
            </button>
            <button type="button" class="fs-float-btn" onclick="CityAssist.recenterFullscreenDoorstep()" title="Focus on Doorstep">
              📍 My Doorstep
            </button>
            <button type="button" class="fs-float-btn" onclick="LeafletMapEngine.fitAllRoutes(); CityAssist.showToast('Fit all routes to view 🗺️');" title="Fit all routes">
              📐 Fit All Routes
            </button>
          </div>
        </div>

        <!-- Route Checkpoints Progress List (Dynamic Driver Stops) -->
        <div class="fs-route-checkpoints-card">
          <div class="fs-checkpoints-header">
            <h4 class="fs-checkpoints-title">Live Route Checkpoints</h4>
            <span class="fs-checkpoints-badge">Live Driver Stops</span>
          </div>

          <div class="fs-stops-timeline">
            <!-- Rendered dynamically by GPSTrackerEngine.renderCitizenStopsUI() -->
            ${(() => {
              const stops = (typeof GPSTrackerEngine !== 'undefined') ? GPSTrackerEngine.getRouteStops() : [];
              if (stops.length === 0) {
                return `
                  <div style="text-align:center; padding:16px; color:#64748B; font-size:0.85rem;">
                    📍 Driver has not added custom stops yet.<br>Vehicle route will appear dynamically as driver marks stops.
                  </div>
                `;
              }
              return stops.map((s, idx) => {
                const isCompleted = s.status === 'completed';
                const isActive = s.status === 'active';
                return `
                  <div class="fs-stop-item ${isCompleted ? 'completed' : (isActive ? 'current' : 'upcoming')}">
                    <div class="fs-stop-icon" style="background:${isCompleted ? '#16A34A' : (isActive ? '#0F7943' : '#94A3B8')}; color:#FFF;">
                      ${isCompleted ? '✓' : (isActive ? '🚚' : idx + 1)}
                    </div>
                    <div class="fs-stop-info">
                      <div class="fs-stop-name">Stop ${idx + 1}: ${s.name}</div>
                      <div class="fs-stop-meta">
                        ${s.area} • ${s.bins} Bins ${isCompleted ? `• <span style="color:#16A34A; font-weight:800;">Completed at ${s.completedAt || ''}</span>` : (isActive ? '• <span style="color:#15803D; font-weight:800;">● Active Pickup Zone</span>' : '• ⏳ Upcoming')}
                      </div>
                    </div>
                  </div>
                `;
              }).join('');
            })()}
          </div>
        </div>

        <!-- Action Footer -->
        <div class="fs-map-footer-actions">
          <button type="button" class="primary-green-btn" onclick="CityAssist.showAudioAnnouncerStudioModal();" style="flex:1; padding:12px; font-weight:800; font-size:0.9rem;">
            🎙️ Voice Alert Studio & Chimes
          </button>
          <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; color:#475569; border:none; padding:12px 18px; border-radius:12px; font-weight:700; cursor:pointer;">
            Close Map
          </button>
        </div>
      </div>
    `;
  },

  renderOTPVerificationModal(phone, demoOtp = "4920") {
    return `
      <div class="modal-header-block" style="text-align:center;">
        <div style="width:54px; height:54px; border-radius:50%; background:#DCFCE7; color:#15803D; display:flex; align-items:center; justify-content:center; font-size:1.8rem; margin:0 auto 10px;">
          📱
        </div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:4px;">Enter Verification Code</h3>
        <p style="color:#64748B; font-size:0.85rem; margin-bottom:16px;">
          We have sent a 4-digit verification code to <strong style="color:#0F172A;">+91 ${phone}</strong>
        </p>
      </div>

      <!-- 4-Digit OTP Inputs -->
      <div style="display:flex; justify-content:center; gap:12px; margin-bottom:16px;">
        <input type="text" maxlength="1" id="otp-digit-1" class="otp-digit-box" autofocus oninput="if(this.value) document.getElementById('otp-digit-2').focus()">
        <input type="text" maxlength="1" id="otp-digit-2" class="otp-digit-box" oninput="if(this.value) document.getElementById('otp-digit-3').focus()">
        <input type="text" maxlength="1" id="otp-digit-3" class="otp-digit-box" oninput="if(this.value) document.getElementById('otp-digit-4').focus()">
        <input type="text" maxlength="1" id="otp-digit-4" class="otp-digit-box" oninput="if(this.value) AuthEngine.verifyOTP()">
      </div>

      <!-- Quick Auto-Fill Demo OTP Pill -->
      <div style="text-align:center; margin-bottom:18px;">
        <button type="button" onclick="document.getElementById('otp-digit-1').value='4'; document.getElementById('otp-digit-2').value='9'; document.getElementById('otp-digit-3').value='2'; document.getElementById('otp-digit-4').value='0'; AuthEngine.verifyOTP();" style="background:#F0FDF4; border:1px solid #BBF7D0; color:#15803D; font-size:0.75rem; font-weight:800; padding:5px 12px; border-radius:14px; cursor:pointer;">
          ⚡ Auto-Fill Demo OTP (${demoOtp})
        </button>
      </div>

      <!-- Verify Button -->
      <button type="button" class="primary-green-btn" onclick="AuthEngine.verifyOTP()" style="width:100%; padding:14px; font-weight:800; font-size:0.95rem; margin-bottom:12px;">
        Verify & Continue 🚀
      </button>

      <div style="text-align:center; font-size:0.78rem; color:#64748B;">
        Didn't receive code? <a href="javascript:void(0)" onclick="CityAssist.showToast('Resending OTP to +91 ${phone}...')" style="color:#0F7943; font-weight:800;">Resend OTP</a>
      </div>
    `;
  },

  renderForgotPasswordModal() {
    return `
      <div class="modal-header-block" style="text-align:center;">
        <div style="font-size:2rem; margin-bottom:6px;">🔑</div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:4px;">Reset Password</h3>
        <p style="color:#64748B; font-size:0.85rem; margin-bottom:16px;">Enter your registered mobile or email to receive a secure recovery link.</p>
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block; font-size:0.8rem; font-weight:800; color:#475569; margin-bottom:6px;">Mobile or Email</label>
        <input type="text" id="forgot-id-input" placeholder="e.g. +91 98765 43210 or siddhant@gmail.com" style="width:100%; padding:12px; border:1px solid #CBD5E1; border-radius:12px; font-size:0.9rem; outline:none; font-family:inherit;">
      </div>

      <button type="button" class="primary-green-btn" onclick="CityAssist.showToast('Password reset link sent to your mobile & email! 📩'); CityAssist.closeModal();" style="width:100%; padding:12px; font-weight:800; margin-bottom:10px;">
        Send Recovery Link
      </button>
      <button type="button" onclick="CityAssist.closeModal()" style="width:100%; background:#F1F5F9; color:#475569; border:none; padding:10px; border-radius:12px; font-weight:700; cursor:pointer;">
        Cancel
      </button>
    `;
  },

  renderGoogleAuthChooserModal(accounts = []) {
    const listHtml = accounts.map(acc => `
      <div onclick="AuthEngine.selectGoogleAccount('${acc.email}')" style="display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:14px; border:1px solid ${acc.isCustom ? '#86EFAC' : '#E2E8F0'}; margin-bottom:8px; cursor:pointer; background:${acc.isCustom ? '#F0FDF4' : '#FFFFFF'}; transition:all 0.2s;" onmouseover="this.style.background='#F8FAFC'; this.style.borderColor='#CBD5E1';" onmouseout="this.style.background='${acc.isCustom ? '#F0FDF4' : '#FFFFFF'}'; this.style.borderColor='${acc.isCustom ? '#86EFAC' : '#E2E8F0'}';">
        <img src="${acc.avatar}" alt="${acc.name}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1.5px solid ${acc.isCustom ? '#22C55E' : '#CBD5E1'};">
        <div style="flex:1;">
          <div style="font-weight:800; color:#0F172A; font-size:0.92rem; display:flex; align-items:center; gap:6px;">
            ${acc.name}
            ${acc.isCustom ? '<span style="background:#DCFCE7; color:#15803D; font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:6px;">⭐ Your Account</span>' : ''}
          </div>
          <div style="color:#64748B; font-size:0.78rem;">${acc.email}</div>
        </div>
        <span style="font-size:0.72rem; font-weight:800; background:#F1F5F9; color:#475569; padding:4px 8px; border-radius:10px;">${acc.role === 'driver' ? 'Driver' : 'Citizen'}</span>
      </div>
    `).join('');

    return `
      <div class="modal-header-block" style="text-align:center; padding-bottom:10px;">
        <svg style="width:38px; height:38px; margin:0 auto 8px;" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:4px;">Sign in with Google</h3>
        <p style="color:#64748B; font-size:0.85rem; margin-bottom:14px;">Select your Google account to continue to <strong style="color:#0F172A;">CityAssist</strong></p>
      </div>

      <div style="max-height:220px; overflow-y:auto; margin-bottom:12px;">
        ${listHtml}
      </div>

      <!-- Real Google Account Direct Connection Card -->
      <div style="background:#F8FAFC; border:1.5px solid #CBD5E1; border-radius:16px; padding:12px 14px; margin-bottom:14px;">
        <div style="font-weight:800; color:#1E293B; font-size:0.85rem; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          <span>🌐</span> Connect Your Real Google / Gmail Account
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
          <input type="text" id="real-google-name" placeholder="Your Real Name" style="padding:10px 12px; border:1px solid #CBD5E1; border-radius:10px; font-size:0.85rem; outline:none; font-family:inherit;">
          <input type="email" id="real-google-email" placeholder="your.name@gmail.com" style="padding:10px 12px; border:1px solid #CBD5E1; border-radius:10px; font-size:0.85rem; outline:none; font-family:inherit;">
        </div>
        <button type="button" class="primary-green-btn" onclick="const n=document.getElementById('real-google-name')?.value; const e=document.getElementById('real-google-email')?.value; AuthEngine.addAndLoginRealGoogleAccount(n, e);" style="width:100%; padding:10px; font-weight:800; font-size:0.85rem;">
          ✓ Link & Sign In with My Google Account 🚀
        </button>
      </div>

      <div style="font-size:0.75rem; color:#94A3B8; text-align:center; line-height:1.4; margin-bottom:10px;">
        Google will share your name, email address, and profile picture with CityAssist.
      </div>

      <button type="button" onclick="CityAssist.closeModal()" style="width:100%; background:#F1F5F9; color:#475569; border:none; padding:10px; border-radius:12px; font-weight:700; cursor:pointer;">
        Cancel
      </button>
    `;
  },

  renderNotificationsModal() {
    const hasPerm = typeof NotificationEngine !== 'undefined' && NotificationEngine.hasPermission;
    const history = (typeof NotificationEngine !== 'undefined' && NotificationEngine.notificationHistory) ? NotificationEngine.notificationHistory : [];

    const itemsHtml = history.map(item => `
      <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:14px; padding:12px 14px; margin-bottom:10px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <strong style="font-size:0.9rem; color:#0F172A;">${item.title}</strong>
          <span style="font-size:0.72rem; color:#94A3B8;">${item.timestamp}</span>
        </div>
        <p style="font-size:0.82rem; color:#475569; margin:0; line-height:1.4;">${item.body}</p>
      </div>
    `).join('');

    return `
      <div class="modal-header-block" style="text-align:center; padding-bottom:6px;">
        <div style="font-size:2rem; margin-bottom:4px;">🔔</div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:4px;">Notifications & Alerts</h3>
        <p style="color:#64748B; font-size:0.85rem;">Essential doorstep arrival & municipal alerts</p>
      </div>

      <!-- Permission Status Banner -->
      <div style="background:${hasPerm ? '#F0FDF4' : '#FEF3C7'}; border:1.5px solid ${hasPerm ? '#86EFAC' : '#FDE68A'}; border-radius:14px; padding:12px; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div>
          <strong style="font-size:0.85rem; color:${hasPerm ? '#15803D' : '#92400E'}; display:block;">
            ${hasPerm ? '🟢 Background Alerts Active' : '⚠️ Background Alerts Disabled'}
          </strong>
          <span style="font-size:0.74rem; color:${hasPerm ? '#166534' : '#B45309'};">
            ${hasPerm ? 'You receive doorstep alerts even when app is closed.' : 'Enable permission to get arrival sirens & alerts.'}
          </span>
        </div>
        ${!hasPerm ? `
          <button type="button" class="primary-green-btn" onclick="NotificationEngine.requestPermission().then(() => CityAssist.showNotificationsModal())" style="padding:6px 12px; font-size:0.78rem; font-weight:800; white-space:nowrap;">
            Enable 🔔
          </button>
        ` : ''}
      </div>

      <!-- Quick Test Action -->
      <div style="background:#F8FAFC; border:1px dashed #CBD5E1; border-radius:14px; padding:10px 14px; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between;">
        <span style="font-size:0.8rem; font-weight:700; color:#475569;">Simulate Closed App Alert:</span>
        <button type="button" onclick="NotificationEngine.scheduleTestClosedAppAlert()" style="background:#0F7943; color:#FFF; border:none; padding:7px 12px; border-radius:10px; font-size:0.78rem; font-weight:800; cursor:pointer;">
          ⚡ Test in 4s (Close App)
        </button>
      </div>

      <div style="max-height:220px; overflow-y:auto; margin-bottom:14px;">
        ${itemsHtml.length > 0 ? itemsHtml : '<div style="text-align:center; padding:20px; color:#94A3B8; font-size:0.85rem;">No alerts yet. You will be notified when collection truck arrives.</div>'}
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <button type="button" onclick="CityAssist.showNotificationSettings()" style="background:#F1F5F9; color:#334155; border:1px solid #CBD5E1; padding:10px; border-radius:12px; font-weight:700; font-size:0.85rem; cursor:pointer;">
          ⚙️ Alert Settings
        </button>
        <button type="button" class="primary-green-btn" onclick="CityAssist.closeModal()" style="padding:10px; font-weight:800; font-size:0.85rem;">
          Done
        </button>
      </div>
    `;
  },

  renderNotificationSettingsModal() {
    const s = (typeof NotificationEngine !== 'undefined') ? NotificationEngine.settings : { arrivalAlerts: true, civicUpdates: true, emergencyAlerts: true, soundEnabled: true, vibrationEnabled: true, geofenceRadiusMeters: 300 };

    return `
      <div class="modal-header-block" style="text-align:center; padding-bottom:6px;">
        <div style="font-size:2rem; margin-bottom:4px;">⚙️</div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0F172A; margin-bottom:4px;">Alert Preferences</h3>
        <p style="color:#64748B; font-size:0.85rem;">Configure arrival sirens & background push</p>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
        <!-- Toggle 1 -->
        <label style="display:flex; align-items:center; justify-content:space-between; background:#F8FAFC; border:1px solid #E2E8F0; padding:12px 14px; border-radius:14px; cursor:pointer;">
          <div>
            <strong style="font-size:0.88rem; color:#0F172A; display:block;">🚚 Doorstep Arrival Siren</strong>
            <span style="font-size:0.75rem; color:#64748B;">Alerts when truck is within proximity</span>
          </div>
          <input type="checkbox" ${s.arrivalAlerts ? 'checked' : ''} onchange="NotificationEngine.settings.arrivalAlerts = this.checked; NotificationEngine.saveSettings();" style="width:20px; height:20px; accent-color:#0F7943;">
        </label>

        <!-- Toggle 2 -->
        <label style="display:flex; align-items:center; justify-content:space-between; background:#F8FAFC; border:1px solid #E2E8F0; padding:12px 14px; border-radius:14px; cursor:pointer;">
          <div>
            <strong style="font-size:0.88rem; color:#0F172A; display:block;">⚠️ Civic Ticket Status Updates</strong>
            <span style="font-size:0.75rem; color:#64748B;">When municipal squad resolves your issue</span>
          </div>
          <input type="checkbox" ${s.civicUpdates ? 'checked' : ''} onchange="NotificationEngine.settings.civicUpdates = this.checked; NotificationEngine.saveSettings();" style="width:20px; height:20px; accent-color:#0F7943;">
        </label>

        <!-- Toggle 3 -->
        <label style="display:flex; align-items:center; justify-content:space-between; background:#F8FAFC; border:1px solid #E2E8F0; padding:12px 14px; border-radius:14px; cursor:pointer;">
          <div>
            <strong style="font-size:0.88rem; color:#0F172A; display:block;">📢 Emergency Municipal Notices</strong>
            <span style="font-size:0.75rem; color:#64748B;">Water maintenance, roadwork, power alerts</span>
          </div>
          <input type="checkbox" ${s.emergencyAlerts ? 'checked' : ''} onchange="NotificationEngine.settings.emergencyAlerts = this.checked; NotificationEngine.saveSettings();" style="width:20px; height:20px; accent-color:#0F7943;">
        </label>

        <!-- Toggle 4: Audio Siren & Vibration -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <label style="display:flex; align-items:center; justify-content:space-between; background:#F8FAFC; border:1px solid #E2E8F0; padding:10px 12px; border-radius:12px; cursor:pointer;">
            <span style="font-size:0.82rem; font-weight:800; color:#334155;">🔊 Audio Siren</span>
            <input type="checkbox" ${s.soundEnabled ? 'checked' : ''} onchange="NotificationEngine.settings.soundEnabled = this.checked; NotificationEngine.saveSettings();" style="width:18px; height:18px; accent-color:#0F7943;">
          </label>
          <label style="display:flex; align-items:center; justify-content:space-between; background:#F8FAFC; border:1px solid #E2E8F0; padding:10px 12px; border-radius:12px; cursor:pointer;">
            <span style="font-size:0.82rem; font-weight:800; color:#334155;">📳 Vibration</span>
            <input type="checkbox" ${s.vibrationEnabled ? 'checked' : ''} onchange="NotificationEngine.settings.vibrationEnabled = this.checked; NotificationEngine.saveSettings();" style="width:18px; height:18px; accent-color:#0F7943;">
          </label>
        </div>

        <!-- Proximity Radius Selector -->
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:12px 14px; border-radius:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="font-size:0.85rem; color:#0F172A;">Doorstep Alert Distance</strong>
            <span id="radius-val-text" style="font-size:0.82rem; font-weight:800; color:#0F7943;">${s.geofenceRadiusMeters || 300} meters</span>
          </div>
          <input type="range" min="100" max="800" step="50" value="${s.geofenceRadiusMeters || 300}" oninput="document.getElementById('radius-val-text').textContent = this.value + ' meters'; NotificationEngine.settings.geofenceRadiusMeters = parseInt(this.value); NotificationEngine.saveSettings();" style="width:100%; accent-color:#0F7943;">
        </div>
      </div>

      <button type="button" class="primary-green-btn" onclick="CityAssist.closeModal(); CityAssist.showToast('Notification settings saved! ✓');" style="width:100%; padding:12px; font-weight:800;">
        Save Preferences 💾
      </button>
    `;
  }
};
