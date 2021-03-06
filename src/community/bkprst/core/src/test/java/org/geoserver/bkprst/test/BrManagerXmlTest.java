/* 
 * Copyright (c) 2001 - 2012 TOPP - www.openplans.org. All rights reserved.
 * This code is licensed under the GPL 2.0 license, availible at the root
 * application directory.
 */
package org.geoserver.bkprst.test;

import java.util.UUID;

import org.geoserver.bkprst.BackupTask;
import org.geoserver.bkprst.BrManager;
import org.geoserver.bkprst.BrTask;
import org.geoserver.bkprst.RestoreTask;
import org.geoserver.test.GeoServerAbstractTestSupport;
import org.geoserver.test.GeoServerTestSupport;

import com.thoughtworks.xstream.XStream;

public class BrManagerXmlTest extends GeoServerTestSupport {

    private BrManager br;

    private XStream xstream;
    
    public void setUpInternal() {
        this.br = (BrManager) GeoServerAbstractTestSupport.applicationContext.getBean("brmanager");
    }

    public void testBackupTask() throws Exception {
        String backupDir=Utils.prepareBackupDir(this); 
        UUID id = this.br.addBackupTask(backupDir, false, false, false);
        BrTask task= this.br.getTask(id);
        String xml = this.br.toXML(task);
        assertTrue(xml.contains("<id>" + id + "</id>"));
        assertTrue(xml.contains("<backup>"));
        assertTrue(xml.contains("<state>"));
        assertTrue(xml.contains("<progress>"));
        assertTrue(xml.contains("<path>" + backupDir + "</path>"));
        
        BrTask task2= new BackupTask(null, "", null, null);
        this.br.fromXML(xml, task2);
        assertTrue(task.getId().equals(id));
    }

    public void testRestoreTask() throws Exception {
        String backupDir=Utils.prepareBackupDir(this); 
        UUID id = this.br.addRestoreTask(backupDir);
        BrTask task= this.br.getTask(id);
        String xml = this.br.toXML(task);
        assertTrue(xml.contains("<id>" + id + "</id>"));
        assertTrue(xml.contains("<restore>"));
        assertTrue(xml.contains("<state>"));
        assertTrue(xml.contains("<progress>"));
        assertTrue(xml.contains("<path>" + backupDir + "</path>"));
        
        RestoreTask task2= new RestoreTask(null, "", null, null);
        this.br.fromXML(xml, task2);
        assertTrue(task.getId().equals(id));
    }
    
    public void testTasks() throws Exception {
        String backupDir=Utils.prepareBackupDir(this); 
        this.br.addTask(new MockRestoreTask(br.generateId(), backupDir, br.getWriteLocker()));
        this.br.addTask(new MockBackupTask(br.generateId(), backupDir, br.getWriteLocker()));
        this.br.addTask(new MockRestoreTask(br.generateId(), backupDir, br.getWriteLocker()));

        String xml = this.br.toXML(this.br);
        assertTrue(xml.contains("<tasks>"));
        assertTrue(xml.contains("</tasks>"));

        try {
            Thread.sleep((BrManagerTest.TASKDURATION + 1000) * 4);
            Thread.sleep(60000);
        } catch (InterruptedException e) {
            assertTrue(false);
        }

        this.br.cleanupTasks();
        xml = this.br.toXML(this.br);
        assertTrue(xml.contains("<tasks/>"));
    }
    
}
