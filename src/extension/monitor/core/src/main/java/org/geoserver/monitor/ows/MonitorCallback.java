/* Copyright (c) 2001 - 2011 TOPP - www.openplans.org. All rights reserved.
 * This code is licensed under the GPL 2.0 license, availible at the root
 * application directory.
 */
package org.geoserver.monitor.ows;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.geoserver.catalog.Catalog;
import org.geoserver.monitor.Monitor;
import org.geoserver.monitor.RequestData;
import org.geoserver.monitor.RequestData.Category;
import org.geoserver.monitor.RequestData.Status;
import org.geoserver.monitor.ows.wcs10.DescribeCoverageHandler;
import org.geoserver.monitor.ows.wcs10.GetCoverageHandler;
import org.geoserver.monitor.ows.wfs.DescribeFeatureTypeHandler;
import org.geoserver.monitor.ows.wfs.GetFeatureHandler;
import org.geoserver.monitor.ows.wfs.LockFeatureHandler;
import org.geoserver.monitor.ows.wfs.TransactionHandler;
import org.geoserver.monitor.ows.wms.GetFeatureInfoHandler;
import org.geoserver.monitor.ows.wms.GetLegendGraphicHandler;
import org.geoserver.monitor.ows.wms.GetMapHandler;
import org.geoserver.ows.DispatcherCallback;
import org.geoserver.ows.Request;
import org.geoserver.ows.Response;
import org.geoserver.platform.GeoServerExtensions;
import org.geoserver.platform.Operation;
import org.geoserver.platform.Service;
import org.geoserver.platform.ServiceException;


public class MonitorCallback implements DispatcherCallback {

    List<RequestObjectHandler> handlers = new ArrayList<RequestObjectHandler>();
    
    Monitor monitor;
    
    public MonitorCallback(Monitor monitor, Catalog catalog) {
        this.monitor = monitor;
        
        //wfs
        handlers.add(new DescribeFeatureTypeHandler(monitor.getConfig(), catalog));
        handlers.add(new GetFeatureHandler(monitor.getConfig(), catalog));
        handlers.add(new LockFeatureHandler(monitor.getConfig(), catalog));
        handlers.add(new TransactionHandler(monitor.getConfig(), catalog));
        
        //wms
        handlers.add(new GetFeatureInfoHandler(monitor.getConfig()));
        handlers.add(new GetMapHandler(monitor.getConfig()));
        handlers.add(new GetLegendGraphicHandler(monitor.getConfig()));
        
        //wcs
        handlers.add(new DescribeCoverageHandler(monitor.getConfig()));
        handlers.add(new GetCoverageHandler(monitor.getConfig()));
        
        handlers.add(new org.geoserver.monitor.ows.wcs11.DescribeCoverageHandler(monitor.getConfig()));
        handlers.add(new org.geoserver.monitor.ows.wcs11.GetCoverageHandler(monitor.getConfig()));
    }
    
    public Request init(Request request) {
        return null;
    }

    public Response responseDispatched(Request request, Operation operation, Object result,
            Response response) {
        return null;
    }

    public Service serviceDispatched(Request request, Service service) throws ServiceException {
        return null;
    }
    
    public Operation operationDispatched(Request request, Operation operation) {
        RequestData data = monitor.current();
        if (data == null) {
            //will happen in cases where the filter is not active
            return operation;
        }
        
        data.setCategory(Category.OWS);
        data.setService(operation.getService().getId().toUpperCase());
        data.setOperation(normalizedOpId(operation));
        data.setOwsVersion(operation.getService().getVersion().toString());
        
        if (operation.getParameters().length > 0) {
            //TODO: a better check for the request object
            Object reqObj = operation.getParameters()[0];
            for (RequestObjectHandler h : handlers) {
                if (h.canHandle(reqObj)) {
                    h.handle(reqObj, data);
                    break;
                }
            }
        }
        
        monitor.update();
        
        return operation;
    }
    
    public Object operationExecuted(Request request, Operation operation, Object result) {
        return null;
    }
    
    public void finished(Request request) {
        if (request.getError() != null) {
            RequestData data = monitor.current();
            if (data == null) {
                //will happen in cases where the filter is not active
                return;
            }
            
            data.setStatus(Status.FAILED);
            data.setErrorMessage(request.getError().getLocalizedMessage());
            data.setError(request.getError());
            
            monitor.update();
        }
    }
    
    Map<String,Map<String,String>> OPS;

    String normalizedOpId(Operation op) {
        if (OPS == null) {
            synchronized (this) {
                if (OPS == null) {
                    OPS = new HashMap<String,Map<String,String>>();
                    for (Service s : GeoServerExtensions.extensions(Service.class)) {
                        HashMap<String,String> map = new HashMap<String,String>();
                        OPS.put(s.getId().toUpperCase(), map);
                        
                        for (String o : s.getOperations()) {
                            map.put(o.toUpperCase(), o);
                        }
                    }
                }
            }
        }

        Map<String,String> map = OPS.get(op.getService().getId().toUpperCase());
        if (map != null) {
            String normalized = map.get(op.getId().toUpperCase());
            if (normalized != null) {
                return normalized;
            }
        }

        return op.getId();
    }
}
