package com.chatbot.data;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "label_data")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LabelData {

    @Id
    @Column(name = "label_id")
    private Long labelId;

    @Column(name = "cao_no")
    private Long caoNo;

    @Column(name = "leadset")
    private String leadset;

    @Column(name = "prod_version")
    private Integer prodVersion;

    @Column(name = "status")
    private Integer status;

    @Column(name = "pagoda_place")
    private String pagodaPlace;

    @Column(name = "invalid_dt_zt")
    private LocalDateTime invalidDtZt;

    @Column(name = "lsl_uniq_nr")
    private String lslUniqNr;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "quantity_produced")
    private Integer quantityProduced;

    @Column(name = "is_kanban")
    private Integer isKanban;

    @Column(name = "label_info")
    private String labelInfo;

    @Column(name = "label_info_ext")
    private String labelInfoExt;

    @Column(name = "fifo_used")
    private Integer fifoUsed;

    @Column(name = "subcontractor")
    private String subcontractor;

    @Column(name = "bundles_feedback_erp_date")
    private LocalDateTime bundlesFeedbackErpDate;

    @Column(name = "expiration_date")
    private LocalDateTime expirationDate;

    @Column(name = "insert_time")
    private LocalDateTime insertTime;

    @Column(name = "update_time")
    private LocalDateTime updateTime;
}
